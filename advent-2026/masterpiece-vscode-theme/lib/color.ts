// 色の計算：変換、WCAG のコントラスト比、色の差（ΔE2000）、読みやすさを満たすための調整。
// 式の出典
// - コントラスト比・相対輝度：WCAG 2.2（https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio）
// - OKLab：Björn Ottosson（https://bottosson.github.io/posts/oklab/）
// - ΔE2000：Sharma, Wu, Dalal (2005) "The CIEDE2000 Color-Difference Formula"

export type RGB = [number, number, number]; // 0〜255

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (l: number) => 255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055);

/** WCAG の相対輝度（0〜1） */
export function luminance(hex: string): number {
  return luminanceRgb(hexToRgb(hex));
}

/** WCAG の相対輝度（RGB から。大量の画素を調べるとき用） */
export function luminanceRgb(rgb: RGB): number {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG のコントラスト比（1〜21） */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------- OKLab / OKLCH（明るさだけを動かす調整に使う） ----------

export type OKLab = [number, number, number];

export function rgbToOklab(rgb: RGB): OKLab {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → sRGB（色域の外なら null） */
export function oklabToRgb([L, a, b]: OKLab): RGB | null {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  if (lin.some((v) => v < -1e-4 || v > 1 + 1e-4)) return null;
  return lin.map((v) => fromLinear(Math.min(1, Math.max(0, v)))) as RGB;
}

/** 明るさ L を変えた色。色域に入らなければ彩度を少しずつ下げる（色相は保つ） */
export function withLightness(hex: string, L: number): string {
  const [, a, b] = rgbToOklab(hexToRgb(hex));
  for (let k = 1; k >= 0; k -= 0.02) {
    const rgb = oklabToRgb([L, a * k, b * k]);
    if (rgb) return rgbToHex(rgb);
  }
  return rgbToHex(oklabToRgb([Math.min(1, Math.max(0, L)), 0, 0])!);
}

export const lightness = (hex: string) => rgbToOklab(hexToRgb(hex))[0];

// ---------- CIE Lab と ΔE2000（調整でどれだけ色が変わったかを測る） ----------

export function rgbToLab(rgb: RGB): [number, number, number] {
  const [r, g, b] = rgb.map(toLinear);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function deltaE2000(lab1: [number, number, number], lab2: [number, number, number]): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h = (a: number, b: number) => (a === 0 && b === 0 ? 0 : ((Math.atan2(b, a) / rad) + 360) % 360);
  const h1p = h(a1p, b1);
  const h2p = h(a2p, b2);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
    else hbarp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbarp - 30) * rad) +
    0.24 * Math.cos(2 * hbarp * rad) +
    0.32 * Math.cos((3 * hbarp + 6) * rad) -
    0.2 * Math.cos((4 * hbarp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

export const colorDifference = (a: string, b: string) => deltaE2000(rgbToLab(hexToRgb(a)), rgbToLab(hexToRgb(b)));

// ---------- 読みやすさの調整 ----------

/** WCAG AA の基準（通常の文字） */
export const AA = 4.5;

/**
 * 背景に対してコントラスト比が min 以上になるまで、文字色の明るさだけを動かす（色相は保つ）。
 * 背景が暗ければ明るく、明るければ暗くする。必要な分だけ動かすので、元の色にできるだけ近いまま。
 */
export function ensureContrast(fg: string, bg: string, min = AA): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const L0 = lightness(fg);
  const towardLight = luminance(bg) < 0.18;
  // 二分探索：元の明るさから、端（白 or 黒）の方向へ
  let lo = L0;
  let hi = towardLight ? 1 : 0;
  if (contrastRatio(withLightness(fg, hi), bg) < min) {
    // 端まで動かしても足りない（背景が中間の明るさ）→ 白か黒のうち良いほう
    return contrastRatio("#ffffff", bg) >= contrastRatio("#000000", bg) ? "#ffffff" : "#000000";
  }
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(withLightness(fg, mid), bg) >= min) hi = mid;
    else lo = mid;
  }
  return withLightness(fg, hi);
}
