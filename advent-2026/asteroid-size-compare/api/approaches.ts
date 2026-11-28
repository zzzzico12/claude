// GET /api/approaches：今日から30日・0.2 au 以内の接近と、大きさ・距離・速さの比べ方（すべてコードで計算）
import { DAYS, DIST_MAX_AU } from "../lib/jpl.js";
import { getSnapshot } from "../lib/data.js";
import { errorResponse, json } from "../lib/http.js";
import { ATTRIBUTION } from "../lib/sources.js";
import { OBJECTS } from "../reference/objects.js";

export async function GET(): Promise<Response> {
  try {
    const s = await getSnapshot();
    return json(
      200,
      {
        fetchedAt: s.fetchedAt,
        range: { days: DAYS, distMaxAu: DIST_MAX_AU },
        assumptions: { albedo: "0.05–0.25", formula: "D[km] = 1329 / sqrt(albedo) * 10^(-H/5)", moonDistanceKm: 384400 },
        approaches: s.rows,
        objectsRetrievedAt: OBJECTS.retrievedAt,
        attribution: ATTRIBUTION,
      },
      "public, max-age=300, s-maxage=600",
    );
  } catch (err) {
    return errorResponse(err);
  }
}
