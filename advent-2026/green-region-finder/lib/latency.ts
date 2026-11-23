// 通信の往復時間（RTT）の推定。実測ではなく目安。
//
// 距離だけの推定（distanceRttMs）は、海をまたぐ長い区間で大きく外れる。
// 例：東京〜スウェーデンは大円距離 8,200km で、距離だけだと約110ms だが、Azure の実測は253ms（回線がシベリアの上を通らないため）。
// そこで、長い区間は Azure のリージョン間の実測値（lib/latency-data.ts）を使う：
//   利用者 →（距離で推定）→ 利用者に最も近い Azure リージョン A →（実測）→ 目的地に最も近い Azure リージョン B →（距離で推定）→ 目的地
import { AZURE_RTT } from "./latency-data.js";
import { REGIONS } from "./regions.js";

// 光ファイバーの中の光の速さ：約 200,000 km/秒 ＝ 200 km/ミリ秒。回線は一直線ではないので回り道の係数を掛ける
export const FIBER_KM_PER_MS = 200;
export const ROUTE_FACTOR = 1.3;
/** 機器の処理などの固定分（距離だけの推定で使う） */
export const FIXED_MS = 5;

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
type Point = { lat: number; lon: number };

/** 2点間の大円距離（km） */
export function distanceKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const legMs = (km: number) => (2 * km * ROUTE_FACTOR) / FIBER_KM_PER_MS;

/** 距離だけの推定（ミリ秒、整数） */
export function distanceRttMs(km: number): number {
  return Math.round(legMs(km) + FIXED_MS);
}

/** これより近い2点は、中継点を使わず距離だけで推定する（近距離は回り道が少なく、中継点を通すとかえって外れる） */
export const HUB_MIN_KM = 2000;

/** 実測値のある Azure のリージョン（中継点） */
const HUBS = REGIONS.filter((r) => r.provider === "azure" && AZURE_RTT[r.id]);

function measured(a: string, b: string): number | null {
  const ab = AZURE_RTT[a]?.[b];
  const ba = AZURE_RTT[b]?.[a];
  if (ab === undefined && ba === undefined) return null;
  // 向きによって少し違うので平均する
  return ((ab ?? ba)! + (ba ?? ab)!) / 2;
}

export interface RttEstimate {
  ms: number;
  method: "hub" | "distance";
  /** 中継に使った Azure のリージョン */
  via?: [string, string];
}

/**
 * 往復時間の推定。exclude に入れた Azure リージョンは中継点に使わない（評価で、答えそのものを使わないようにするため）
 */
export function estimateRtt(from: Point, to: Point, exclude: ReadonlySet<string> = new Set()): RttEstimate {
  const km = distanceKm(from, to);
  const hubs = HUBS.filter((h) => !exclude.has(h.id));
  const nearest = (p: Point) => hubs.reduce((best, h) => (distanceKm(p, h) < distanceKm(p, best) ? h : best), hubs[0]);
  if (hubs.length === 0 || km < HUB_MIN_KM) return { ms: distanceRttMs(km), method: "distance" };
  const a = nearest(from);
  const b = nearest(to);
  const m = a.id === b.id ? null : measured(a.id, b.id);
  if (m === null) return { ms: distanceRttMs(km), method: "distance" };
  const hub = legMs(distanceKm(from, a)) + m + legMs(distanceKm(b, to));
  // 近い2点なのに遠回りの中継を通る、といった不自然な結果は避ける（距離だけの推定より速くはならないが、遅すぎもしない範囲に）
  return { ms: Math.round(Math.max(hub, distanceRttMs(km))), method: "hub", via: [a.id, b.id] };
}
