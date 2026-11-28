// POST /api/detail  { "problem": "寒い場所でも電池を長持ちさせたい", "kind": "patent" | "report", "id": "LEW-TOPS-184" }
// 1件の特許・報告書を、課題に合わせて詳しく解説し、活用プランを出す
import { dailyLimit, getStore, hashKey } from "@advent/store";
import { explainDetail, nextSteps } from "../lib/detail.js";
import { errorResponse, HttpError, json, preflight } from "../lib/http.js";
import { loadIndex } from "../lib/index-file.js";
import { getReport } from "../lib/ntrs.js";
import { ATTRIBUTION } from "../lib/sources.js";

// 検索（1日10回）とは別に数える。同じ課題・同じ候補は保存した結果を返す
const DAILY_LIMIT = 30;
const PER_IP_LIMIT = 10;
const CACHE_TTL = 30 * 24 * 60 * 60;

export const OPTIONS = preflight;

export async function POST(request: Request): Promise<Response> {
  try {
    let body: { problem?: unknown; kind?: unknown; id?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "JSON で送ってください");
    }
    const problem = typeof body.problem === "string" ? body.problem.trim() : "";
    const kind = body.kind === "report" ? "report" : body.kind === "patent" ? "patent" : null;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (problem.length < 5 || problem.length > 500) throw new HttpError(400, "problem に5〜500字の課題を入れてください");
    if (!kind || !id) throw new HttpError(400, 'kind（"patent" か "report"）と id を入れてください');

    // 説明文は、特許は手元の一覧から、報告書は NTRS から取る（利用者が送った文は使わない）
    let item: { title: string; text: string; url: string; pdfUrl: string | null };
    if (kind === "patent") {
      const p = loadIndex()?.patents.find((x) => x.id === id);
      if (!p) throw new HttpError(404, `特許 ${id} が見つかりません`);
      item = { title: p.title, text: p.description, url: p.url, pdfUrl: null };
    } else {
      const r = await getReport(id);
      if (!r) throw new HttpError(404, `報告書 ${id} が見つかりません（公開で要約のあるものだけ）`);
      item = { title: r.title, text: r.abstract, url: r.url, pdfUrl: r.pdfUrl };
    }

    const store = getStore();
    const key = `nasa-tech-finder:detail:${await hashKey(JSON.stringify([problem, kind, id]))}`;
    const cached = await store.get(key);
    if (cached) return json(200, { ...JSON.parse(cached), cached: true });

    const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
    const limited = await dailyLimit(store, { app: "nasa-tech-finder-detail", ip, total: DAILY_LIMIT, perIp: PER_IP_LIMIT });
    if (limited) return json(429, { error: limited, code: "limit" });

    const { detail, unmatchedNumbers } = await explainDetail({ problem, kind, id, title: item.title, text: item.text });
    const out = {
      problem,
      kind,
      id,
      title: item.title,
      url: item.url,
      detail,
      check: { unmatchedNumbers },
      nextSteps: nextSteps(kind, id, item.pdfUrl),
      attribution: ATTRIBUTION,
      createdAt: new Date().toISOString(),
    };
    await store.set(key, JSON.stringify(out), CACHE_TTL);
    return json(200, out);
  } catch (err) {
    return errorResponse(err);
  }
}
