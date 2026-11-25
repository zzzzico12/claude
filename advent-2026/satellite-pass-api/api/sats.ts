// GET /api/sats
// 予測できる衛星の一覧（CelesTrak の stations と visual）。よく聞かれる衛星を先頭に出す
import { expandGp } from "@advent/orbit";
import { FAMOUS, getGp } from "../lib/gp-source.js";
import { errorResponse, GP_UNAVAILABLE, HttpError, json } from "../lib/http.js";

export async function GET(): Promise<Response> {
  try {
    const r = await getGp();
    if (!r) throw new HttpError(503, GP_UNAVAILABLE);
    const all = expandGp(r.gp);
    const famous = FAMOUS.filter((f) => all.some((g) => g.NORAD_CAT_ID === f.norad)).map((f) => ({ norad: f.norad, name: all.find((g) => g.NORAD_CAT_ID === f.norad)!.OBJECT_NAME, ja: f.ja, en: f.en }));
    const rest = all
      .filter((g) => !FAMOUS.some((f) => f.norad === g.NORAD_CAT_ID))
      .map((g) => ({ norad: g.NORAD_CAT_ID, name: g.OBJECT_NAME }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return json(200, { fetchedAt: r.gp.fetchedAt, satellites: [...famous, ...rest] }, "public, max-age=600, s-maxage=3600");
  } catch (err) {
    return errorResponse(err);
  }
}
