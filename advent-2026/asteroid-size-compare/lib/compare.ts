// 数字はすべてここで計算する（AI には計算させない）
import type { RefObject } from "./objects.js";

/** 1 au（km）。IAU 2012 で定義された値 */
export const AU_KM = 149_597_870.7;
/** 反射率（アルベド）の仮定の幅。小惑星の多くはこの範囲（暗い炭素質〜明るい石質） */
export const ALBEDO_MIN = 0.05;
export const ALBEDO_MAX = 0.25;

/**
 * 絶対等級 H から直径の幅（m）。D[km] = 1329 / √p × 10^(−H/5)
 * 反射率が分からないので、明るい（0.25）と小さく、暗い（0.05）と大きく見積もる
 */
export function diameterFromH(h: number): { min: number; max: number } {
  const d = (p: number) => (1329 / Math.sqrt(p)) * 10 ** (-h / 5) * 1000;
  return { min: d(ALBEDO_MAX), max: d(ALBEDO_MIN) };
}

/** 有効数字2桁で丸める（画面と AI に渡す数字はこの形にそろえる） */
export function sig2(x: number): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  const p = 10 ** (Math.floor(Math.log10(Math.abs(x))) - 1);
  return Math.round(x / p) * p;
}
/** 浮動小数の誤差を消す（0.30000000000000004 → 0.3） */
const clean = (x: number) => Number(x.toPrecision(12));
export const r2 = (x: number) => clean(sig2(x));

export interface SizeComparison {
  qid: string;
  name: { ja: string; en: string };
  what: { ja: string; en: string };
  counter: string;
  /** 比べる物の大きさ（m） */
  value: number;
  /** 小惑星の大きさ ÷ 比べる物の大きさ（最小〜最大。有効数字2桁） */
  ratio: { min: number; max: number };
}

/**
 * 大きさの比べ方を、分かりやすい順に並べる：比がおよそ1（同じくらい）に近い物ほど上。
 * 「東京タワー 0.0003本分」のような極端な比は分かりにくいので、比の真ん中が 1/30〜30 の物だけ
 */
export function sizeComparisons(size: { min: number; max: number }, objects: RefObject[], top = 4): SizeComparison[] {
  return objects
    .filter((o) => o.kind === "size")
    .map((o) => ({ o, mid: Math.sqrt((size.min / o.value) * (size.max / o.value)) }))
    .filter(({ mid }) => mid >= 1 / 30 && mid <= 30)
    .sort((a, b) => Math.abs(Math.log(a.mid)) - Math.abs(Math.log(b.mid)))
    .slice(0, top)
    .map(({ o }) => ({
      qid: o.qid,
      name: o.name,
      what: o.what,
      counter: o.counter,
      value: o.value,
      ratio: { min: r2(size.min / o.value), max: r2(size.max / o.value) },
    }));
}

/** 3D で並べられる物（public/models にモデルがあるもの）。人は Wikidata ではなく身長 1.7 m と仮定 */
export const MODEL_QIDS = ["Q42196", "Q41225", "Q37200", "Q25173", "Q243", "Q183536", "Q44440", "Q39231"];
export const PERSON_M = 1.7;

export interface ModelComparison {
  qid: string;
  name: { ja: string; en: string };
  what: { ja: string; en: string };
  value: number;
  /** 比べる物 ÷ 小惑星の最大（この物が小惑星より大きいか小さいか、並べ方を決めるのに使う） */
  ratio: { min: number; max: number };
}

/** 3D で並べられる物との比（すべて。画面で選べるようにする） */
export function modelComparisons(size: { min: number; max: number }, objects: RefObject[]): ModelComparison[] {
  return objects
    .filter((o) => o.kind === "size" && MODEL_QIDS.includes(o.qid))
    .sort((a, b) => a.value - b.value)
    .map((o) => ({ qid: o.qid, name: o.name, what: o.what, value: o.value, ratio: { min: r2(size.min / o.value), max: r2(size.max / o.value) } }));
}

export interface Approach {
  /** 名前（例：2026 WK1、217628） */
  des: string;
  fullname: string;
  /** いちばん近づく時刻（UTC、ISO 8601） */
  time: string;
  /** 時刻の不確かさ（JPL の t_sigma_f。例：< 00:01、2_19:21） */
  timeSigma: string;
  /** 地球の中心からの距離（au）。最小〜最大は軌道の不確かさの幅 */
  dist: number;
  distMin: number;
  distMax: number;
  /** 地球に対する速さ（km/s） */
  vRel: number;
  h: number | null;
  /** 測られた直径（km）。ないことが多い */
  diameter: number | null;
  diameterSigma: number | null;
}

export interface Facts {
  size: { min: number; max: number; measured: boolean };
  sizeComparisons: SizeComparison[];
  /** 3D で並べられる物との比 */
  modelComparisons: ModelComparison[];
  distance: {
    km: number;
    /** 月までの平均距離の何倍（いちばん近いとき） */
    moon: number;
    moonMin: number;
    moonMax: number;
    /** 地球の直径の何個分 */
    earthDiameters: number;
  };
  speed: {
    kmPerS: number;
    kmPerH: number;
    /** 新幹線 E5系の最高速度の何倍 */
    shinkansen: number;
    /** 地球の公転の速さの何倍 */
    earthOrbit: number;
  };
}

const find = (objects: RefObject[], qid: string, prop: string) => {
  const o = objects.find((x) => x.qid === qid && x.prop === prop);
  if (!o) throw new Error(`比べる物 ${qid} ${prop} がありません（reference/objects.json）`);
  return o;
};

/** 1件の接近について、画面と AI に渡す数字をまとめて計算する */
export function factsOf(a: Approach, objects: RefObject[]): Facts {
  const est = a.h != null ? diameterFromH(a.h) : null;
  const size =
    a.diameter != null
      ? { min: (a.diameter - (a.diameterSigma ?? 0)) * 1000, max: (a.diameter + (a.diameterSigma ?? 0)) * 1000, measured: true }
      : est
        ? { ...est, measured: false }
        : { min: NaN, max: NaN, measured: false };
  const moon = find(objects, "Q405", "P2233").value / 1000; // km
  const earthD = find(objects, "Q2", "P2386").value / 1000; // km
  const e5 = find(objects, "Q957322", "P2052").value / 1000; // km/s
  const earthV = find(objects, "Q2", "P2052").value / 1000; // km/s
  const km = a.dist * AU_KM;
  return {
    size: { min: r2(size.min), max: r2(size.max), measured: size.measured },
    sizeComparisons: Number.isFinite(size.min) ? sizeComparisons(size, objects) : [],
    modelComparisons: Number.isFinite(size.min) ? modelComparisons(size, objects) : [],
    distance: {
      km: r2(km),
      moon: r2(km / moon),
      moonMin: r2((a.distMin * AU_KM) / moon),
      moonMax: r2((a.distMax * AU_KM) / moon),
      earthDiameters: r2(km / earthD),
    },
    speed: { kmPerS: r2(a.vRel), kmPerH: r2(a.vRel * 3600), shinkansen: r2(a.vRel / e5), earthOrbit: r2(a.vRel / earthV) },
  };
}

/** AI の文章の数字と照合するための、計算した数字の一覧 */
export function allowedNumbers(f: Facts, a: Approach): number[] {
  const out = [f.size.min, f.size.max, f.distance.km, f.distance.moon, f.distance.moonMin, f.distance.moonMax, f.distance.earthDiameters];
  out.push(f.speed.kmPerS, f.speed.kmPerH, f.speed.shinkansen, f.speed.earthOrbit);
  for (const c of f.sizeComparisons) out.push(c.ratio.min, c.ratio.max, c.value);
  for (const c of f.modelComparisons) out.push(c.ratio.min, c.ratio.max, c.value);
  // 日時（月・日・時・分。UTC と日本時間）と、km 単位の大きさ（0.12 km など）も
  const d = new Date(a.time);
  const jst = new Date(d.getTime() + 9 * 3600_000);
  for (const x of [d, jst]) out.push(x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes());
  out.push(f.size.min / 1000, f.size.max / 1000);
  return out;
}
