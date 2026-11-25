// 通過の予測（Day07 衛星の通過予測API）
// 「見える」の条件は NASA Spot the Station と同じ考え方：
//   1. 衛星が地平線から minElevationDeg（既定 10 度）以上の高さにある
//   2. 観測地の空が暗い（太陽が地平線の 6 度以上下。市民薄明が終わったあと／始まる前）
//   3. 衛星に日が当たっている（地球の影に入っていない）
// 影は円柱で近似する（地球の半径の円柱の中で、太陽と反対側にあれば影）。半影は考えない
import { ecfToLookAngles, eciToEcf, geodeticToEcf, gstime, propagate, sunPos, type SatRec } from "satellite.js";

const DEG = Math.PI / 180;
const AU_KM = 149_597_870.7;
const EARTH_RADIUS_KM = 6378.135; // WGS72（SGP4 と同じ）

export interface Observer {
  lat: number;
  lon: number;
  /** 海抜（km）。既定 0 */
  heightKm?: number;
}

export interface LookPoint {
  time: Date;
  /** 方位角（度。北が 0、東が 90） */
  azimuth: number;
  /** 高さ（度。地平線が 0） */
  elevation: number;
  /** 16方位（N・NNE・NE…） */
  direction: string;
}

export interface Pass {
  /** 見え始め（高さ minElevation 以上になった、または影から出た、または空が暗くなった時刻） */
  start: LookPoint;
  /** 見えているあいだで、いちばん高いとき */
  max: LookPoint;
  /** 見え終わり（高さが下がった、または影に入った時刻） */
  end: LookPoint;
  durationSec: number;
  /** 見え終わりの理由：地平線に近づいた（"horizon"）か、地球の影に入った（"shadow"）か、空が明るくなった（"daylight"） */
  endsBy: "horizon" | "shadow" | "daylight";
}

export interface PassOptions {
  minElevationDeg?: number;
  /** 空が暗いとみなす太陽の高さ（度）。既定 -6（市民薄明） */
  maxSunElevationDeg?: number;
  /** 通過を探すときの刻み（秒）。既定 20 */
  coarseStepSec?: number;
}

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

/** 方位角（度）→ 16方位 */
export function direction16(azimuthDeg: number): string {
  return DIRS[Math.round((((azimuthDeg % 360) + 360) % 360) / 22.5) % 16];
}

const jd = (date: Date) => date.getTime() / 86400_000 + 2440587.5;

/** 太陽の位置（TEME とほぼ同じ向きの赤道座標、km。精度 0.01 度） */
export function sunEci(date: Date) {
  const { rsun } = sunPos(jd(date) as never);
  return { x: rsun.x * AU_KM, y: rsun.y * AU_KM, z: rsun.z * AU_KM };
}

const observerGd = (o: Observer) => ({ latitude: o.lat * DEG, longitude: o.lon * DEG, height: o.heightKm ?? 0 });

/** 観測地から見た、太陽の高さ（度） */
export function sunElevation(observer: Observer, date: Date): number {
  const s = eciToEcf(sunEci(date), gstime(date));
  return ecfToLookAngles(observerGd(observer), s).elevation / DEG;
}

/** 衛星に日が当たっているか（円柱の影で近似） */
export function isSunlit(satEci: { x: number; y: number; z: number }, date: Date): boolean {
  const sun = sunEci(date);
  const n = Math.hypot(sun.x, sun.y, sun.z);
  const ux = sun.x / n,
    uy = sun.y / n,
    uz = sun.z / n;
  const s = satEci.x * ux + satEci.y * uy + satEci.z * uz;
  if (s >= 0) return true; // 太陽の側にいる
  const px = satEci.x - s * ux,
    py = satEci.y - s * uy,
    pz = satEci.z - s * uz;
  return Math.hypot(px, py, pz) > EARTH_RADIUS_KM;
}

interface Sample {
  elevation: number;
  azimuth: number;
  eci: { x: number; y: number; z: number };
}

function sample(satrec: SatRec, observer: Observer, date: Date): Sample | null {
  const pv = propagate(satrec, date);
  if (!pv) return null;
  const la = ecfToLookAngles(observerGd(observer), eciToEcf(pv.position, gstime(date)));
  return { elevation: la.elevation / DEG, azimuth: la.azimuth / DEG, eci: pv.position };
}

function look(satrec: SatRec, observer: Observer, date: Date): LookPoint {
  const s = sample(satrec, observer, date)!;
  return { time: date, azimuth: s.azimuth, elevation: s.elevation, direction: direction16(s.azimuth) };
}

/** f(t) が false → true に変わる時刻を、二分法で 0.5 秒まで詰める */
function bisect(lo: number, hi: number, f: (t: number) => boolean): number {
  while (hi - lo > 500) {
    const mid = (lo + hi) / 2;
    if (f(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * start から end までに「見える」通過を探す。
 * 1. 粗い刻みで高さを調べ、地平線（minElevation）の上にいるあいだ（上がる→下がる）を見つける
 * 2. そのあいだを 1 秒ごとに調べ、日が当たっていて空が暗い区間を「見える」とする
 */
export function findVisiblePasses(satrec: SatRec, observer: Observer, start: Date, end: Date, opts: PassOptions = {}): Pass[] {
  const minEl = opts.minElevationDeg ?? 10;
  const maxSun = opts.maxSunElevationDeg ?? -6;
  const step = (opts.coarseStepSec ?? 20) * 1000;
  const above = (t: number) => (sample(satrec, observer, new Date(t))?.elevation ?? -90) >= minEl;

  const passes: Pass[] = [];
  let t = start.getTime();
  const t1 = end.getTime();
  let prevAbove = above(t);
  let riseAt = prevAbove ? t : NaN;
  for (t += step; t <= t1 + step; t += step) {
    const now = above(t);
    if (!prevAbove && now) riseAt = bisect(t - step, t, above);
    if (prevAbove && !now && !Number.isNaN(riseAt)) {
      const setAt = bisect(t - step, t, (x) => !above(x));
      const p = visiblePart(satrec, observer, riseAt, setAt, maxSun);
      if (p) passes.push(p);
      riseAt = NaN;
    }
    prevAbove = now;
  }
  return passes.filter((p) => p.start.time.getTime() >= start.getTime() && p.start.time.getTime() <= t1);
}

/** 地平線の上にいるあいだ [riseAt, setAt] のうち、見える区間（いちばん長いもの）を返す */
function visiblePart(satrec: SatRec, observer: Observer, riseAt: number, setAt: number, maxSun: number): Pass | null {
  // 昼間の通過は、1 秒ごとに調べるまでもなく除く（太陽の高さは数分ではほとんど変わらない）
  if (sunElevation(observer, new Date(riseAt)) > maxSun + 2 && sunElevation(observer, new Date(setAt)) > maxSun + 2) return null;

  let best: { a: number; b: number; endsBy: Pass["endsBy"] } | null = null;
  let segStart = NaN;
  for (let t = riseAt; t <= setAt; t += 1000) {
    const d = new Date(t);
    const s = sample(satrec, observer, d);
    const sunlit = s ? isSunlit(s.eci, d) : false;
    const dark = sunElevation(observer, d) <= maxSun;
    const ok = sunlit && dark;
    const last = t + 1000 > setAt;
    if (ok && Number.isNaN(segStart)) segStart = t;
    if ((!ok || last) && !Number.isNaN(segStart)) {
      const segEnd = ok ? setAt : t;
      const endsBy: Pass["endsBy"] = ok ? "horizon" : !sunlit ? "shadow" : "daylight";
      if (!best || segEnd - segStart > best.b - best.a) best = { a: segStart, b: segEnd, endsBy };
      segStart = NaN;
    }
  }
  if (!best || best.b - best.a < 1000) return null;

  // 見えているあいだで、いちばん高いとき（黄金分割で探す。区間の端がいちばん高いこともある）
  let lo = best.a,
    hi = best.b;
  const el = (t: number) => sample(satrec, observer, new Date(t))?.elevation ?? -90;
  const g = (Math.sqrt(5) - 1) / 2;
  while (hi - lo > 500) {
    const m1 = hi - g * (hi - lo),
      m2 = lo + g * (hi - lo);
    if (el(m1) < el(m2)) lo = m1;
    else hi = m2;
  }
  let maxT = (lo + hi) / 2;
  if (el(best.a) > el(maxT)) maxT = best.a;
  if (el(best.b) > el(maxT)) maxT = best.b;

  return {
    start: look(satrec, observer, new Date(best.a)),
    max: look(satrec, observer, new Date(maxT)),
    end: look(satrec, observer, new Date(best.b)),
    durationSec: Math.round((best.b - best.a) / 1000),
    endsBy: best.endsBy,
  };
}

export interface TrackPoint {
  time: Date;
  azimuth: number;
  elevation: number;
  /** 見える条件（高さ・空の暗さ・日が当たっている）をすべて満たすか */
  visible: boolean;
}

/**
 * from から to までの空の通り道（stepSec 秒ごと）。地平線の下の点は除く。
 * 図に描くためのもの。見えない部分（地球の影の中・低すぎる・空が明るい）も visible=false で返す
 */
export function passTrack(satrec: SatRec, observer: Observer, from: Date, to: Date, stepSec = 5, opts: PassOptions = {}): TrackPoint[] {
  const minEl = opts.minElevationDeg ?? 10;
  const maxSun = opts.maxSunElevationDeg ?? -6;
  const out: TrackPoint[] = [];
  for (let t = from.getTime(); t <= to.getTime(); t += stepSec * 1000) {
    const d = new Date(t);
    const s = sample(satrec, observer, d);
    if (!s || s.elevation < 0) continue;
    const visible = s.elevation >= minEl && isSunlit(s.eci, d) && sunElevation(observer, d) <= maxSun;
    out.push({ time: d, azimuth: s.azimuth, elevation: s.elevation, visible });
  }
  return out;
}
