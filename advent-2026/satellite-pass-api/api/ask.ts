// POST /api/ask  { question: "札幌で今週いちばん見やすいのは？", lang?: "ja" | "en", lat?, lon? }
// 質問から場所・日数・衛星を AI が取り出し、コードが通過を計算して順位を付け、AI が答えを文章にする
import { dailyLimit, getStore, hashKey } from "@advent/store";
import { answer, factsFor, parseQuestion, type Lang } from "../lib/ask.js";
import { errorResponse, HttpError, json, loadSatellite, resolveLocation } from "../lib/http.js";
import { MAX_DAYS, predict } from "../lib/predict.js";
import { clouds } from "../lib/weather.js";

const DAILY_LIMIT = 10; // 全体で1日10回
const PER_IP_LIMIT = 3;
const CACHE_TTL = 60 * 60; // 同じ質問の答えは1時間使い回す（雲量の予報も1時間ごと）

export async function POST(request: Request): Promise<Response> {
  try {
    let body: { question?: unknown; lang?: unknown; lat?: unknown; lon?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "JSON で送ってください");
    }
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question || question.length > 300) throw new HttpError(400, "question に300字以内の質問を入れてください");
    const lang: Lang = body.lang === "en" ? "en" : "ja";

    const store = getStore();
    const key = `satellite-pass-api:ask:${await hashKey(JSON.stringify([question, lang, body.lat ?? null, body.lon ?? null]))}`;
    const cached = await store.get(key);
    if (cached) return json(200, { ...JSON.parse(cached), cached: true });

    const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
    const limited = await dailyLimit(store, { app: "satellite-pass-api", ip, total: DAILY_LIMIT, perIp: PER_IP_LIMIT });
    if (limited) return json(429, { error: limited, code: "limit" });

    // 1. 質問から条件を取り出す（地名がなければ、画面で選んだ場所を使う）
    const q = await parseQuestion(question);
    const loc = await resolveLocation(q.place ? { place: q.place } : { lat: body.lat, lon: body.lon }, lang).catch((err) => {
      if (err instanceof HttpError && !q.place) throw new HttpError(400, "質問に地名を入れるか、場所を選んでから聞いてください");
      throw err;
    });
    const { gp } = await loadSatellite(q.satellite ?? undefined);
    const days = Math.min(q.days ?? MAX_DAYS, MAX_DAYS);

    // 2. コードが通過を計算して順位を付ける
    const p = predict(gp, loc.lat, loc.lon, days, await clouds(loc.lat, loc.lon));
    const placeName = loc.place ? [loc.place.name, loc.place.admin1, loc.place.country].filter(Boolean).join(", ") : null;
    const facts = factsFor(p, placeName, lang);

    // 3. 答えを文章にする
    const a = await answer(question, facts, lang);
    const out = { answer: a.text, unmatchedNumbers: a.unmatchedNumbers, understood: { ...q, days }, prediction: { ...p, location: { ...p.location, name: placeName } }, createdAt: new Date().toISOString() };
    await store.set(key, JSON.stringify(out), CACHE_TTL);
    return json(200, out);
  } catch (err) {
    return errorResponse(err);
  }
}
