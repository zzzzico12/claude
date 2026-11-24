// 通過の予測と順位付け（数字はすべてコードで出す。AI には計算させない）
import { findVisiblePasses, toSatrec, type Gp, type LookPoint, type Pass } from "@advent/orbit";
import { cloudAt, type Clouds } from "./weather.js";

export const MAX_DAYS = 7;

export interface PointOut {
  /** UTC（ISO 8601） */
  time: string;
  /** 観測地の時刻（ISO 8601、時差つき） */
  localTime: string;
  azimuth: number;
  elevation: number;
  direction: string;
}

export interface PassOut {
  rank: number;
  score: number;
  start: PointOut;
  max: PointOut;
  end: PointOut;
  durationSec: number;
  endsBy: Pass["endsBy"];
  /** いちばん高いときの雲量（%。予報の範囲外なら null） */
  cloudCover: number | null;
}

/**
 * 見やすさの点数（100点満点）＝（高さの点＋時間の点）× 雲の割合
 * - 最大の高さ：80点（真上 90 度で満点。低いと建物や山に隠れやすい）
 * - 見える時間：20点（6分以上で満点）
 * - 雲の割合：1 − 0.9 × 雲量（快晴で 1、全天の雲で 0.1）。予報の範囲外は雲量50%とみなして 0.55
 * はじめは雲量を足し算（30点）にしていたが、雲量98%の真上の通過が1位になったので掛け算にした
 */
export function score(p: Pick<Pass, "durationSec"> & { maxElevation: number; cloudCover: number | null }): number {
  const el = (Math.min(p.maxElevation, 90) / 90) * 80;
  const dur = (Math.min(p.durationSec, 360) / 360) * 20;
  const cloud = 1 - 0.9 * ((p.cloudCover ?? 50) / 100);
  return Math.round((el + dur) * cloud);
}

/** 時差つきの ISO 8601（例：2026-11-28T18:12:05+09:00） */
export function localIso(t: Date, offsetSec: number): string {
  const d = new Date(t.getTime() + offsetSec * 1000).toISOString().slice(0, 19);
  const sign = offsetSec >= 0 ? "+" : "-";
  const a = Math.abs(offsetSec);
  return `${d}${sign}${String(Math.floor(a / 3600)).padStart(2, "0")}:${String(Math.floor((a % 3600) / 60)).padStart(2, "0")}`;
}

const point = (p: LookPoint, off: number): PointOut => ({
  time: p.time.toISOString().slice(0, 19) + "Z",
  localTime: localIso(p.time, off),
  azimuth: Math.round(p.azimuth),
  elevation: Math.round(p.elevation),
  direction: p.direction,
});

export interface Prediction {
  satellite: { norad: number; name: string; elementsEpoch: string };
  location: { lat: number; lon: number; timezone: string; utcOffsetSeconds: number };
  from: string;
  to: string;
  passes: PassOut[];
}

/** 見える通過を探し、雲量を付けて、点数の高い順に順位を付ける（並びは時刻順のまま） */
export function predict(gp: Gp, lat: number, lon: number, days: number, c: Clouds, now = new Date()): Prediction {
  const satrec = toSatrec(gp);
  if (!satrec) throw new Error("この衛星の軌道要素は計算できません");
  const to = new Date(now.getTime() + days * 86400_000);
  const off = c.utcOffsetSeconds;
  const raw = findVisiblePasses(satrec, { lat, lon }, now, to);
  const passes: PassOut[] = raw.map((p) => {
    const cloudCover = cloudAt(c, p.max.time.getTime());
    return {
      rank: 0,
      score: score({ durationSec: p.durationSec, maxElevation: p.max.elevation, cloudCover }),
      start: point(p.start, off),
      max: point(p.max, off),
      end: point(p.end, off),
      durationSec: p.durationSec,
      endsBy: p.endsBy,
      cloudCover,
    };
  });
  // 点数が同じなら、早いほうを上に
  [...passes].sort((a, b) => b.score - a.score || a.start.time.localeCompare(b.start.time)).forEach((p, i) => (p.rank = i + 1));
  return {
    satellite: { norad: gp.NORAD_CAT_ID, name: gp.OBJECT_NAME, elementsEpoch: gp.EPOCH.slice(0, 19) + "Z" },
    location: { lat, lon, timezone: c.timezone, utcOffsetSeconds: off },
    from: now.toISOString().slice(0, 19) + "Z",
    to: to.toISOString().slice(0, 19) + "Z",
    passes,
  };
}
