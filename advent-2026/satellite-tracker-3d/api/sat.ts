// GET /api/sat?norad=25544
// クリックした1機ぶんの UCS Satellite Database の項目を返す（まとめたファイルは配らない。lib/ucs.ts）
import { loadUcs } from "../lib/server-data.js";

export async function GET(request: Request): Promise<Response> {
  const norad = Number(new URL(request.url).searchParams.get("norad"));
  if (!Number.isInteger(norad) || norad <= 0 || norad > 999_999) return json(400, { error: "NORAD 番号が正しくありません" });
  const ucs = loadUcs();
  if (!ucs) return json(503, { error: "衛星の情報（UCS）を準備できていません" });
  // UCS は2023年5月で止まっていて中身が変わらないので、長くキャッシュしてよい
  return json(200, { ucs: ucs[String(norad)] ?? null }, "public, max-age=86400, s-maxage=2592000");
}

function json(status: number, body: unknown, cache?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8" };
  if (cache) headers["Cache-Control"] = cache;
  return new Response(JSON.stringify(body), { status, headers });
}
