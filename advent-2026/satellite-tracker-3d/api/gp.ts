// GET /api/gp  稼働中の全衛星の軌道要素（計算に要る項目だけ）
// CelesTrak への問い合わせは lib/gp-source.ts で2時間に1回までにしている。
// さらに Vercel の CDN に15分キャッシュさせ、この関数自体もあまり呼ばれないようにする
import { getGp } from "../lib/gp-source.js";

export async function GET(): Promise<Response> {
  const r = await getGp();
  if (!r) {
    return new Response(JSON.stringify({ error: "軌道のデータを用意できませんでした。少し時間をおいて試してください" }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8", "Retry-After": "120" },
    });
  }
  return new Response(JSON.stringify({ ...r.gp, stale: r.stale }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
