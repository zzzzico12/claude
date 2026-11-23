// POST /api/explain  { norad: 25544 }
// 衛星の素性と軌道の数字はサーバーで用意し（画面から送られた数字は使わない）、AI の解説だけを返す
import { expandGp } from "@advent/orbit";
import { dailyLimit, getStore } from "@advent/store";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { explain, type Catalog, type UcsRecord } from "../lib/explain.js";
import { getGp } from "../lib/gp-source.js";

const DAILY_LIMIT = 10; // 全体で1日10回
const PER_IP_LIMIT = 3;
const CACHE_TTL = 60 * 60 * 24 * 30; // 衛星の素性はめったに変わらないので30日

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

let data: { catalog: Catalog; ucs: Record<string, UcsRecord> } | undefined;
function load() {
  // vercel.json の includeFiles で、関数と一緒に置かれる
  data ??= {
    catalog: JSON.parse(readFileSync(join(process.cwd(), "public", "data", "catalog.json"), "utf8")),
    ucs: JSON.parse(readFileSync(join(process.cwd(), "public", "data", "ucs.json"), "utf8")),
  };
  return data;
}

export async function POST(request: Request): Promise<Response> {
  let norad: number;
  try {
    norad = Number((await request.json()).norad);
  } catch {
    return json(400, { error: "JSON で送ってください" });
  }
  if (!Number.isInteger(norad) || norad <= 0 || norad > 999_999) return json(400, { error: "NORAD 番号が正しくありません" });

  const store = getStore();
  const key = `satellite-tracker-3d:explain:${norad}`;
  const cached = await store.get(key);
  if (cached) return json(200, { ...JSON.parse(cached), cached: true });

  const r = await getGp();
  const gp = r && expandGp(r.gp).find((g) => g.NORAD_CAT_ID === norad);
  if (!gp) return json(404, { error: "この衛星の軌道のデータが見つかりません" });

  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const limited = await dailyLimit(store, { app: "satellite-tracker-3d", ip, total: DAILY_LIMIT, perIp: PER_IP_LIMIT });
  if (limited) return json(429, { error: limited });

  try {
    const { catalog, ucs } = load();
    const result = await explain(gp, catalog, ucs[String(norad)]);
    const out = { text: result.text, unmatchedNumbers: result.unmatchedNumbers, createdAt: new Date().toISOString() };
    await store.set(key, JSON.stringify(out), CACHE_TTL);
    return json(200, out);
  } catch (err) {
    console.error(err);
    return json(500, { error: "解説の作成に失敗しました。時間をおいて試してください" });
  }
}
