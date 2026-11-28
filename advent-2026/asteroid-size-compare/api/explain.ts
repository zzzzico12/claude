// GET /api/explain?des=2026%20WK1&time=2026-12-03T11:08:00Z&lang=ja
// 1件の接近を、身近なものに置き換えて説明する（AI）。小惑星・言語ごとに1回だけ作って保存し、全員で使い回す
import { dailyLimit, getStore, hashKey } from "@advent/store";
import { getSnapshot } from "../lib/data.js";
import { explainApproach, type Lang } from "../lib/explain.js";
import { errorResponse, HttpError, json } from "../lib/http.js";

const DAILY_LIMIT = 50; // 全体で1日50回（作った説明は保存して使い回すので、ふだんはここまで届かない）
const CACHE_TTL = 45 * 24 * 60 * 60;

export async function GET(request: Request): Promise<Response> {
  try {
    const q = new URL(request.url).searchParams;
    const lang: Lang = q.get("lang") === "en" ? "en" : "ja";
    const des = q.get("des") ?? "";
    const time = q.get("time") ?? "";
    // 説明するのは、今の一覧にある接近だけ（任意の名前で AI を呼ばせない）
    const row = (await getSnapshot()).rows.find((r) => r.des === des && r.time === time);
    if (!row) throw new HttpError(404, lang === "ja" ? "その接近は一覧にありません" : "That approach is not in the current list");

    const store = getStore();
    const key = `asteroid-size-compare:explain:v3:${lang}:${await hashKey(`${des}|${time}`)}`;
    const cached = await store.get(key);
    if (cached) return json(200, { ...JSON.parse(cached), cached: true }, "public, max-age=3600");

    const limited = await dailyLimit(store, { app: "asteroid-size-compare", ip: "all", total: DAILY_LIMIT, perIp: DAILY_LIMIT });
    if (limited) return json(429, { error: lang === "ja" ? "今日の AI の説明の上限に達しました。数字と図はそのまま見られます" : "The daily limit for AI explanations has been reached. Numbers and charts are still available.", code: "limit" });

    const { explanation, unmatchedNumbers } = await explainApproach(row, row.facts, row.sentry, lang);
    const out = { des, time, lang, explanation, check: { unmatchedNumbers }, createdAt: new Date().toISOString() };
    await store.set(key, JSON.stringify(out), CACHE_TTL);
    return json(200, out);
  } catch (err) {
    return errorResponse(err);
  }
}
