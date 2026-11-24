// 軌道計算の共通部品（Day06 人工衛星は今どこ？、Day07 衛星の通過予測API）
// - CelesTrak の GP データ（OMM 形式の JSON）を、送る量を減らした形にしたり戻したりする
// - satellite.js の SGP4 で、ある時刻の位置（地球に固定した座標・緯度経度高度）を計算する
// - 軌道の形（高さ・周期・傾き）と、低軌道・中軌道・静止軌道などの区分をコードで出す
// - 観測地から見える通過（見え始め・いちばん高いとき・見え終わり）を探す（passes.ts）
import { degreesLat, degreesLong, eciToEcf, eciToGeodetic, gstime, json2satrec, propagate, type OMMJsonObject, type SatRec } from "satellite.js";

export type { SatRec } from "satellite.js";
export * from "./passes.js";

/** 地球の赤道半径（km、WGS72。SGP4 と同じ値） */
export const EARTH_RADIUS_KM = 6378.135;
const MU = 398600.8; // km^3/s^2（WGS72）

// ---------- GP データの受け渡し ----------

/** SGP4 の計算に必要な項目だけ（CelesTrak の JSON の項目名のまま） */
export const GP_FIELDS = [
  "NORAD_CAT_ID",
  "OBJECT_NAME",
  "OBJECT_ID",
  "EPOCH",
  "MEAN_MOTION",
  "ECCENTRICITY",
  "INCLINATION",
  "RA_OF_ASC_NODE",
  "ARG_OF_PERICENTER",
  "MEAN_ANOMALY",
  "BSTAR",
  "MEAN_MOTION_DOT",
  "MEAN_MOTION_DDOT",
  "ELEMENT_SET_NO",
] as const;

export type Gp = { [K in (typeof GP_FIELDS)[number]]: K extends "OBJECT_NAME" | "OBJECT_ID" | "EPOCH" ? string : number };

/** 項目名を毎回書かないよう、表の形（列名 + 行）にする。1万7千機で 7MB → 約2MB */
export interface CompactGp {
  fetchedAt: string;
  source: string;
  fields: readonly string[];
  rows: (string | number)[][];
}

export function compactGp(list: Record<string, unknown>[], source: string, fetchedAt = new Date().toISOString()): CompactGp {
  return {
    fetchedAt,
    source,
    fields: GP_FIELDS,
    rows: list.map((o) => GP_FIELDS.map((f) => o[f] as string | number)),
  };
}

export function expandGp(c: CompactGp): Gp[] {
  return c.rows.map((r) => Object.fromEntries(c.fields.map((f, i) => [f, r[i]])) as Gp);
}

export function toSatrec(gp: Gp): SatRec | null {
  try {
    const s = json2satrec(gp as unknown as OMMJsonObject);
    return s.error ? null : s;
  } catch {
    return null;
  }
}

// ---------- 位置 ----------

/**
 * たくさんの衛星の、ある時刻の位置を、地球に固定した座標（ECEF、km）で out に詰める（x, y, z の順）。
 * 計算できなかった衛星（落下した・軌道要素が古すぎる）は NaN。計算できた数を返す。
 */
export function positionsEcf(satrecs: (SatRec | null)[], date: Date, out: Float64Array | Float32Array): number {
  const gmst = gstime(date);
  let ok = 0;
  for (let i = 0; i < satrecs.length; i++) {
    const s = satrecs[i];
    const pv = s ? propagate(s, date) : null;
    if (!pv) {
      out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = NaN;
      continue;
    }
    const e = eciToEcf(pv.position, gmst);
    out[i * 3] = e.x;
    out[i * 3 + 1] = e.y;
    out[i * 3 + 2] = e.z;
    ok++;
  }
  return ok;
}

/** SGP4 そのままの座標（TEME、km）。答え合わせ用 */
export function positionTeme(satrec: SatRec, date: Date): { x: number; y: number; z: number } | null {
  return propagate(satrec, date)?.position ?? null;
}

export interface Geodetic {
  lat: number;
  lon: number;
  altKm: number;
}

export function geodetic(satrec: SatRec, date: Date): Geodetic | null {
  const pv = propagate(satrec, date);
  if (!pv) return null;
  const g = eciToGeodetic(pv.position, gstime(date));
  return { lat: degreesLat(g.latitude), lon: degreesLong(g.longitude), altKm: g.height };
}

// ---------- 軌道の形 ----------

export type Regime = "低軌道" | "中軌道" | "静止軌道" | "傾斜対地同期軌道" | "長楕円軌道" | "その他";

export interface OrbitSummary {
  /** 1周の時間（分） */
  periodMin: number;
  /** 一番高いところ・低いところの高さ（km、地表から） */
  apogeeKm: number;
  perigeeKm: number;
  inclinationDeg: number;
  regime: Regime;
}

/** 平均運動（1日の周回数）と離心率から、軌道の形を出す（AI に計算させない） */
export function orbitSummary(gp: Pick<Gp, "MEAN_MOTION" | "ECCENTRICITY" | "INCLINATION">): OrbitSummary {
  const n = (Number(gp.MEAN_MOTION) * 2 * Math.PI) / 86400; // rad/s
  const a = Math.cbrt(MU / (n * n));
  const e = Number(gp.ECCENTRICITY);
  const apogeeKm = a * (1 + e) - EARTH_RADIUS_KM;
  const perigeeKm = a * (1 - e) - EARTH_RADIUS_KM;
  const periodMin = 1440 / Number(gp.MEAN_MOTION);
  const inclinationDeg = Number(gp.INCLINATION);
  return { periodMin, apogeeKm, perigeeKm, inclinationDeg, regime: regimeOf(periodMin, e, apogeeKm, inclinationDeg) };
}

/**
 * 区分は UCS Satellite Database の Class of Orbit に近い決め方。
 * 1周が約1日（地球の自転と同じ）でも、傾きが大きいもの（みちびき など）は「傾斜対地同期軌道」として分ける
 */
export function regimeOf(periodMin: number, e: number, apogeeKm: number, inclinationDeg = 0): Regime {
  if (e > 0.25) return "長楕円軌道";
  if (Math.abs(periodMin - 1436) < 30) return inclinationDeg < 15 ? "静止軌道" : "傾斜対地同期軌道";
  if (apogeeKm < 2000) return "低軌道";
  if (periodMin < 1300) return "中軌道";
  return "その他";
}

/** 軌道要素の時刻（エポック）から date まで何日たったか */
export function ageDays(gp: Pick<Gp, "EPOCH">, date: Date): number {
  return (date.getTime() - Date.parse(gp.EPOCH.endsWith("Z") ? gp.EPOCH : `${gp.EPOCH}Z`)) / 86400_000;
}

// ---------- CelesTrak ----------

export const CELESTRAK = "https://celestrak.org/NORAD/elements/gp.php";

/**
 * CelesTrak から GP データを取る。大きなグループ（active・starlink）は取得回数が制限されているので、
 * 呼び出す側で必ずキャッシュする（約2時間ごとの更新より頻繁に取らない）。
 */
export async function fetchGroup(group: string, userAgent: string): Promise<Record<string, unknown>[]> {
  const url = `${CELESTRAK}?GROUP=${encodeURIComponent(group)}&FORMAT=json`;
  const res = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!res.ok) throw new Error(`CelesTrak が HTTP ${res.status} を返しました（${group}）`);
  const text = await res.text();
  // 取得の制限に当たると、JSON ではなく案内の文章が返ることがある
  if (!text.startsWith("[")) throw new Error(`CelesTrak から JSON 以外が返りました：${text.slice(0, 120)}`);
  return JSON.parse(text);
}

// ---------- 答え合わせ用：J2000 → TEME ----------

const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;

type Mat = number[][];
const mul = (a: Mat, b: Mat): Mat => a.map((r) => b[0].map((_, j) => r.reduce((s, v, k) => s + v * b[k][j], 0)));
const rotX = (t: number): Mat => [
  [1, 0, 0],
  [0, Math.cos(t), Math.sin(t)],
  [0, -Math.sin(t), Math.cos(t)],
];
const rotY = (t: number): Mat => [
  [Math.cos(t), 0, -Math.sin(t)],
  [0, 1, 0],
  [Math.sin(t), 0, Math.cos(t)],
];
const rotZ = (t: number): Mat => [
  [Math.cos(t), Math.sin(t), 0],
  [-Math.sin(t), Math.cos(t), 0],
  [0, 0, 1],
];

/**
 * J2000（EME2000）の座標を、SGP4 が使う TEME に変える行列。
 * 歳差（IAU 1976）と、章動の大きい4項（IAU 1980 のうち振幅の大きいもの。残りは 1 秒角未満）だけを入れる。
 * ISS の高さで誤差は数十 m 程度で、軌道要素そのもののずれ（km 単位）を測るには十分
 */
export function j2000ToTeme(date: Date): Mat {
  const jd = date.getTime() / 86400_000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  // 歳差（秒角）
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) * ARCSEC;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T ** 3) * ARCSEC;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) * ARCSEC;
  const P = mul(rotZ(-z), mul(rotY(theta), rotZ(-zeta))); // J2000 → 平均赤道・平均春分点（その日）
  // 章動
  const omega = (125.04452 - 1934.136261 * T) * DEG; // 月の昇交点
  const Ls = (280.4665 + 36000.7698 * T) * DEG; // 太陽の平均黄経
  const Lm = (218.3165 + 481267.8813 * T) * DEG; // 月の平均黄経
  const dpsi = (-17.2 * Math.sin(omega) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * omega)) * ARCSEC;
  const deps = (9.2 * Math.cos(omega) + 0.57 * Math.cos(2 * Ls) + 0.1 * Math.cos(2 * Lm) - 0.09 * Math.cos(2 * omega)) * ARCSEC;
  const eps = (23.439291 - 0.0130042 * T) * DEG;
  const N = mul(rotX(-(eps + deps)), mul(rotZ(-dpsi), rotX(eps))); // 平均 → 真の赤道・真の春分点
  // TEME は「真の赤道・平均春分点」：真の春分点から分点差（dpsi·cos eps）だけ戻す
  const E = rotZ(dpsi * Math.cos(eps));
  return mul(E, mul(N, P));
}

export function apply(m: Mat, v: { x: number; y: number; z: number }) {
  return {
    x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
    y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
    z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
  };
}

/** NASA の ISS 軌道データ（CCSDS OEM）の本文を読む。座標は J2000、km */
export function parseOem(text: string): { t: Date; x: number; y: number; z: number; vx: number; vy: number; vz: number }[] {
  const out = [];
  for (const line of text.split("\n")) {
    const m = line.trim().match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/);
    if (!m) continue;
    const [x, y, z, vx, vy, vz] = m.slice(2).map(Number);
    out.push({ t: new Date(`${m[1]}Z`), x, y, z, vx, vy, vz });
  }
  return out;
}

/**
 * 選んだ衛星の軌道（1周分）を、date の時点の地球に固定した座標（km）で返す。
 * 各点を date の地球の向き（gmst）で変換するので、地上の軌跡ではなく「今この瞬間の軌道の輪」になる
 */
export function orbitRingEcf(satrec: SatRec, date: Date, samples = 180): { x: number; y: number; z: number }[] {
  const periodMs = ((2 * Math.PI) / satrec.no) * 60_000; // satrec.no は rad/分
  const gmst = gstime(date);
  const out = [];
  for (let k = 0; k <= samples; k++) {
    const pv = propagate(satrec, new Date(date.getTime() + (k / samples) * periodMs));
    if (pv) out.push(eciToEcf(pv.position, gmst));
  }
  return out;
}
