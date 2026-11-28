// GET /api/status：探せる特許の件数と、データを集めた日時
import { errorResponse, json } from "../lib/http.js";
import { loadIndex } from "../lib/index-file.js";
import { ATTRIBUTION } from "../lib/sources.js";

export async function GET(): Promise<Response> {
  try {
    const index = loadIndex();
    if (!index) return json(503, { error: "特許のデータを準備できていません" });
    const categories: Record<string, number> = {};
    for (const p of index.patents) categories[p.category] = (categories[p.category] ?? 0) + 1;
    return json(200, { patents: index.patents.length, categories, fetchedAt: index.fetchedAt, builtAt: index.builtAt, model: index.model, attribution: ATTRIBUTION }, "public, max-age=300");
  } catch (err) {
    return errorResponse(err);
  }
}
