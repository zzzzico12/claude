// POST /api/search  { "problem": "寒い場所でも電池を長持ちさせたい" }
// 課題から、使えそうな NASA の特許と技術報告書を探し、AI がやさしく説明する
import { dailyLimit, getStore, hashKey } from "@advent/store";
import { errorResponse, HttpError, json, preflight } from "../lib/http.js";
import { loadIndex } from "../lib/index-file.js";
import { explain, findCandidates, understand } from "../lib/search.js";
import { ATTRIBUTION } from "../lib/sources.js";
import { VoyageBusy, VoyageKeyMissing } from "../lib/voyage.js";

const DAILY_LIMIT = 10; // 全体で1日10回
const PER_IP_LIMIT = 3;
const CACHE_TTL = 7 * 24 * 60 * 60; // 同じ課題の結果は7日使い回す（特許の一覧はデプロイまで変わらない）
const MAX_LEN = 500;

export const OPTIONS = preflight;

export async function POST(request: Request): Promise<Response> {
  try {
    let body: { problem?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "JSON で送ってください");
    }
    const problem = typeof body.problem === "string" ? body.problem.trim() : "";
    if (problem.length < 5 || problem.length > MAX_LEN) throw new HttpError(400, `problem に5〜${MAX_LEN}字の課題を入れてください`);

    const index = loadIndex();
    if (!index) throw new HttpError(503, "特許のデータを準備できていません（server-data/index.json がありません）");

    const store = getStore();
    const key = `nasa-tech-finder:search:${await hashKey(JSON.stringify([problem, index.builtAt]))}`;
    const cached = await store.get(key);
    if (cached) return json(200, { ...JSON.parse(cached), cached: true });

    const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
    const limited = await dailyLimit(store, { app: "nasa-tech-finder", ip, total: DAILY_LIMIT, perIp: PER_IP_LIMIT });
    if (limited) return json(429, { error: limited, code: "limit" });

    // 1. 課題を読む → 2・3. 探す → 4. 説明する
    const need = await understand(problem);
    if (need.notTechnical) throw new HttpError(400, "技術で解決したい課題を書いてください（例：「寒い場所でも電池を長持ちさせたい」）");
    const c = await findCandidates(index, problem, need);
    const checked = await explain(problem, c);

    const round = (x: number) => Math.round(x * 1000) / 1000;
    const out = {
      problem,
      understood: { needEn: need.needEn, queries: need.queries },
      explanation: checked.explanation,
      check: { unknownIds: checked.unknownIds, unmatchedNumbers: checked.unmatchedNumbers },
      patents: c.patents.map((s) => ({ ...s.item, similarity: round(s.score) })),
      reports: c.reports.map((s) => ({ ...s.item, abstract: s.item.abstractPublic ? s.item.abstract : null, similarity: round(s.score) })),
      reportsFound: c.reportsFound,
      index: { patents: index.patents.length, fetchedAt: index.fetchedAt, model: index.model },
      attribution: ATTRIBUTION,
      createdAt: new Date().toISOString(),
    };
    await store.set(key, JSON.stringify(out), CACHE_TTL);
    return json(200, out);
  } catch (err) {
    if (err instanceof VoyageKeyMissing || err instanceof VoyageBusy) return json(503, { error: err.message, code: err instanceof VoyageBusy ? "busy" : "config" });
    return errorResponse(err);
  }
}
