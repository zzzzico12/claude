// POST /api/explain  { lat, lon, requirement, providers, countries }
// 順位はサーバーでも計算し直す（画面から送られた数字は使わない）。AI の説明だけを返す。
import { dailyLimit, getStore, hashKey } from "@advent/store";
import { explain } from "../lib/explain.js";
import { REQUIREMENTS, type Query } from "../lib/recommend.js";
import type { Provider } from "../lib/regions.js";

const DAILY_LIMIT = 50; // 全体で1日50回（Sonnet 5.5 で1回 約0.01ドル）
const PER_IP_LIMIT = 10;
const CACHE_TTL = 60 * 60 * 24 * 7;
const PROVIDERS: Provider[] = ["gcp", "aws", "azure"];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

function parse(body: Record<string, unknown>): Query | string {
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return "場所が正しくありません";
  const requirement = body.requirement as Query["requirement"];
  if (!(requirement in REQUIREMENTS)) return "要件が正しくありません";
  const providers = Array.isArray(body.providers) ? body.providers.filter((p): p is Provider => PROVIDERS.includes(p as Provider)) : [];
  if (!providers.length) return "クラウドを1つ以上選んでください";
  const countries =
    Array.isArray(body.countries) && body.countries.length
      ? body.countries.filter((c): c is string => typeof c === "string" && /^[A-Z]{3}$/.test(c))
      : null;
  // キャッシュが効くよう、場所は 0.5 度（約50km）単位に丸める
  const round = (x: number) => Math.round(x * 2) / 2;
  return { lat: round(lat), lon: round(lon), requirement, providers: [...providers].sort(), countries: countries && [...countries].sort() };
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "JSON で送ってください" });
  }
  const q = parse(body);
  if (typeof q === "string") return json(400, { error: q });

  const store = getStore();
  const key = `green-region-finder:explain:${await hashKey(JSON.stringify(q))}`;
  const cached = await store.get(key);
  if (cached) return json(200, { ...JSON.parse(cached), cached: true });

  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const limited = await dailyLimit(store, { app: "green-region-finder", ip, total: DAILY_LIMIT, perIp: PER_IP_LIMIT });
  if (limited) return json(429, { error: limited });

  try {
    const result = await explain(q);
    if (!result) return json(200, { text: null });
    await store.set(key, JSON.stringify(result), CACHE_TTL);
    return json(200, result);
  } catch (err) {
    console.error(err);
    return json(500, { error: "説明の作成に失敗しました。時間をおいて試してください" });
  }
}
