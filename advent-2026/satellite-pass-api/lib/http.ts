// API の共通部分：JSON の応答と、場所（緯度経度または地名）の読み取り
import { expandGp, type Gp } from "@advent/orbit";
import { findSatellite, getGp } from "./gp-source.js";
import { geocode, type Place } from "./weather.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(status: number, body: unknown, cache?: string): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    // ほかのサイトや手元のスクリプトからも呼べる API にする（キーは使っていない）
    "Access-Control-Allow-Origin": "*",
  };
  if (cache) headers["Cache-Control"] = cache;
  return new Response(JSON.stringify(body, null, 1), { status, headers });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json(err.status, { error: err.message });
  console.error(err);
  return json(500, { error: "内部エラーが起きました。時間をおいて試してください" });
}

/** lat・lon（両方）か place のどちらかで場所を決める */
export async function resolveLocation(params: { lat?: unknown; lon?: unknown; place?: unknown }, lang: "ja" | "en"): Promise<{ lat: number; lon: number; place: Place | null }> {
  if (params.lat != null && params.lat !== "" && params.lon != null && params.lon !== "") {
    const lat = Number(params.lat);
    const lon = Number(params.lon);
    if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) throw new HttpError(400, "lat は -90〜90、lon は -180〜180 の数で指定してください");
    return { lat, lon, place: null };
  }
  if (typeof params.place === "string" && params.place.trim()) {
    const place = await geocode(params.place, lang);
    if (!place) throw new HttpError(404, `「${params.place}」の場所が見つかりません（「札幌市」「Tokyo」のように書いてみてください）`);
    return { lat: place.lat, lon: place.lon, place };
  }
  throw new HttpError(400, "場所を lat と lon、または place で指定してください");
}

export async function loadSatellite(query: unknown): Promise<{ gp: Gp; all: Gp[]; stale: boolean }> {
  const r = await getGp();
  if (!r) throw new HttpError(503, "軌道のデータを準備できていません");
  const all = expandGp(r.gp);
  const gp = findSatellite(all, typeof query === "string" || typeof query === "number" ? query : null);
  if (!gp) throw new HttpError(404, "その衛星は見つかりません（stations と visual の分類にある衛星だけ予測できます。/api/sats で一覧を見られます）");
  return { gp, all, stale: r.stale };
}

export function parseDays(v: unknown, fallback = 7): number {
  if (v == null || v === "") return fallback;
  const d = Number(v);
  if (!Number.isInteger(d) || d < 1 || d > 7) throw new HttpError(400, "days は 1〜7 の整数で指定してください");
  return d;
}
