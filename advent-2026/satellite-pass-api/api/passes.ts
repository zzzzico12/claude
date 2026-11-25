// GET /api/passes?lat=35.68&lon=139.69（または place=札幌市）&sat=25544&days=7&lang=ja&path=1
// 見える通過（見え始め・いちばん高いとき・見え終わりの時刻・方角・高さ）と、その時刻の雲量を返す
import { errorResponse, json, loadSatellite, parseDays, resolveLocation } from "../lib/http.js";
import { predict } from "../lib/predict.js";
import { ATTRIBUTION } from "../lib/sources.js";
import { clouds } from "../lib/weather.js";

export async function GET(request: Request): Promise<Response> {
  try {
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const lang = q.lang === "en" ? "en" : "ja";
    const days = parseDays(q.days);
    const loc = await resolveLocation(q, lang);
    const { gp, stale } = await loadSatellite(q.sat);
    const c = await clouds(loc.lat, loc.lon);
    const p = predict(gp, loc.lat, loc.lon, days, c, new Date(), { path: q.path === "1" });
    return json(
      200,
      {
        ...p,
        location: { ...p.location, name: loc.place ? [loc.place.name, loc.place.admin1, loc.place.country].filter(Boolean).join(", ") : null },
        elementsStale: stale,
        conditions: "高さ10度以上・観測地の太陽が地平線の6度以上下・衛星に日が当たっている（NASA Spot the Station と同じ考え方）",
        attribution: ATTRIBUTION,
      },
      // 同じ場所・同じ条件なら5分は使い回す（見え始めの時刻が数秒ずれる程度）
      "public, max-age=60, s-maxage=300",
    );
  } catch (err) {
    return errorResponse(err);
  }
}
