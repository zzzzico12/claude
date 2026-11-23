// 絵の画像から代表色を取り出す（k-means。見た目の近さに合う OKLab の空間で分ける）。
// 乱数の種を固定しているので、同じ画像からは毎回同じパレットになる。
import jpeg from "jpeg-js";
import { hexToRgb, oklabToRgb, rgbToHex, rgbToOklab, type OKLab } from "./color.js";

export interface PaletteColor {
  hex: string;
  /** 絵の中で占める割合（0〜1） */
  share: number;
  /** OKLab の明るさ（0〜1） */
  lightness: number;
  /** 彩度（OKLab の a, b の大きさ） */
  chroma: number;
  /** 面積は小さいが鮮やかな色（絵の中の灯りや服の赤など）として取り出したものか */
  accent?: boolean;
}

/** 乱数の種を固定した簡単な乱数（mulberry32） */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist2 = (p: OKLab, q: OKLab) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

export function kmeans(points: OKLab[], k: number, iterations = 25, seed = 42): { center: OKLab; count: number }[] {
  const rand = rng(seed);
  // k-means++ の初期値：すでに選んだ中心から遠い点ほど選ばれやすくする
  const centers: OKLab[] = [points[Math.floor(rand() * points.length)]];
  while (centers.length < k) {
    const d = points.map((p) => Math.min(...centers.map((c) => dist2(p, c))));
    const total = d.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let i = 0;
    while (i < d.length - 1 && (r -= d[i]) > 0) i++;
    centers.push(points[i]);
  }
  const assign = new Array<number>(points.length).fill(0);
  for (let it = 0; it < iterations; it++) {
    points.forEach((p, i) => {
      let best = 0;
      for (let c = 1; c < k; c++) if (dist2(p, centers[c]) < dist2(p, centers[best])) best = c;
      assign[i] = best;
    });
    for (let c = 0; c < k; c++) {
      const members = points.filter((_, i) => assign[i] === c);
      if (members.length) {
        centers[c] = [0, 1, 2].map((j) => members.reduce((s, m) => s + m[j], 0) / members.length) as OKLab;
      }
    }
  }
  return centers.map((center, c) => ({ center, count: assign.filter((a) => a === c).length }));
}

/**
 * JPEG から代表色を取り出す。
 * - 面積の大きい色を k 個（多い順）
 * - それとは別に、面積は小さいが鮮やかな色を最大 accents 個（彩度の高い上位3%の画素から）。
 *   面積の順だけだと、夜景の灯りのような絵を特徴づける色が消えてしまうため
 */
export function extractPalette(jpegBytes: Uint8Array, k = 10, accents = 4): PaletteColor[] {
  const img = jpeg.decode(jpegBytes, { useTArray: true, formatAsRGBA: true });
  // 速さのため、約 1/16 の画素だけを使う（4画素ごと×4行ごと）
  const points: OKLab[] = [];
  for (let y = 0; y < img.height; y += 4) {
    for (let x = 0; x < img.width; x += 4) {
      const i = (y * img.width + x) * 4;
      points.push(rgbToOklab([img.data[i], img.data[i + 1], img.data[i + 2]]));
    }
  }
  const toColor = ({ center, count }: { center: OKLab; count: number }, accent = false): PaletteColor => {
    const rgb = oklabToRgb(center) ?? oklabToRgb([center[0], 0, 0])!;
    return {
      hex: rgbToHex(rgb),
      share: Math.round((count / points.length) * 1000) / 1000,
      lightness: Math.round(center[0] * 1000) / 1000,
      chroma: Math.round(Math.hypot(center[1], center[2]) * 1000) / 1000,
      ...(accent ? { accent: true } : {}),
    };
  };
  const main = kmeans(points, k)
    .filter((c) => c.count > 0)
    .map((c) => toColor(c))
    .sort((a, b) => b.share - a.share);

  const chroma = (p: OKLab) => Math.hypot(p[1], p[2]);
  const vivid = [...points].sort((a, b) => chroma(b) - chroma(a)).slice(0, Math.max(accents, Math.floor(points.length * 0.03)));
  const extra = accents > 0 && vivid.length >= accents ? kmeans(vivid, accents, 25, 7).filter((c) => c.count > 0).map((c) => toColor(c, true)) : [];
  // 大きい色とほとんど同じ色（OKLab の距離が近いもの）は加えない。色相の違いも見るので、明るさが同じでも色が違えば残る
  const near = (x: PaletteColor, y: PaletteColor) => {
    const [p, q] = [rgbToOklab(hexToRgb(x.hex)), rgbToOklab(hexToRgb(y.hex))];
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 0.05;
  };
  const distinct = extra.filter((e) => main.every((m) => !near(m, e)));
  return [...main, ...distinct];
}
