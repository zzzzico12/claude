// Open-Meteo：地名の検索（Geocoding API）と、1時間ごとの雲量の予報（Forecast API）
// 無料版は非商用（CC BY 4.0、出典を表示）。1日1万回までなので、結果は保存して使い回す：
//   - 地名 → 緯度経度：30日
//   - 雲量：場所を 0.1 度（約10km）に丸めて1時間
import { getStore, hashKey } from "@advent/store";
import { UA } from "./gp-source.js";

export interface Place {
  name: string;
  admin1?: string;
  country?: string;
  lat: number;
  lon: number;
  timezone?: string;
}

const GEO_TTL = 30 * 24 * 60 * 60;
const CLOUD_TTL = 60 * 60;

async function getJson(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Open-Meteo が HTTP ${res.status} を返しました`);
  return res.json();
}

/**
 * 地名を緯度経度にする。Open-Meteo は「東京」では見つからず「東京都」「Tokyo」なら見つかるので、
 * 見つからなければ「市」「都」「府」「県」を足して試す
 */
export async function geocode(place: string, lang: "ja" | "en" = "ja"): Promise<Place | null> {
  const q = place.trim().slice(0, 80);
  if (!q) return null;
  const store = getStore();
  const key = `satellite-pass-api:geo:${lang}:${await hashKey(q)}`;
  const cached = await store.get(key);
  if (cached) return JSON.parse(cached);

  const tries = [q];
  if (/[぀-ヿ㐀-鿿]/.test(q) && !/[市町村都道府県区]$/.test(q)) tries.push(`${q}市`, `${q}都`, `${q}府`, `${q}県`);
  for (const name of tries) {
    const j = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=${lang}&format=json`);
    const r = j.results?.[0];
    if (r) {
      const p: Place = { name: r.name, admin1: r.admin1, country: r.country, lat: r.latitude, lon: r.longitude, timezone: r.timezone };
      await store.set(key, JSON.stringify(p), GEO_TTL);
      return p;
    }
  }
  return null;
}

export interface Clouds {
  timezone: string;
  utcOffsetSeconds: number;
  /** 1時間ごと：[UTC のミリ秒, 雲量 %] */
  hours: [number, number][];
}

/** 1時間ごとの雲量（全体の雲量 %、8日分）。場所は 0.1 度に丸める */
export async function clouds(lat: number, lon: number): Promise<Clouds> {
  const la = Math.round(lat * 10) / 10;
  const lo = Math.round(lon * 10) / 10;
  const store = getStore();
  const key = `satellite-pass-api:clouds:${la}:${lo}`;
  const cached = await store.get(key);
  if (cached) return JSON.parse(cached);
  const j = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&hourly=cloud_cover&forecast_days=8&timezone=auto`,
  );
  const off = Number(j.utc_offset_seconds ?? 0);
  const hours: [number, number][] = (j.hourly.time as string[]).map((t, i) => [Date.parse(`${t}:00Z`) - off * 1000, j.hourly.cloud_cover[i]]);
  const c: Clouds = { timezone: j.timezone, utcOffsetSeconds: off, hours: hours.filter(([, v]) => v != null) };
  await store.set(key, JSON.stringify(c), CLOUD_TTL);
  return c;
}

/** ある時刻にいちばん近い1時間の雲量（予報の範囲外なら null） */
export function cloudAt(c: Clouds, t: number): number | null {
  let best: [number, number] | null = null;
  for (const h of c.hours) if (!best || Math.abs(h[0] - t) < Math.abs(best[0] - t)) best = h;
  return best && Math.abs(best[0] - t) <= 45 * 60_000 ? best[1] : null;
}
