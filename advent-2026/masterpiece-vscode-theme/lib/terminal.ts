// ターミナル（Warp）用のテーマ：絵を薄めた背景 ＋ 絵の色から作った文字色と16色（ANSI カラー）
// - 16色は意味が決まっている（赤＝エラー、緑＝成功…）ので、色相は基本の色に近いまま、絵の色合いに寄せる
// - 背景に敷く絵の濃さは、実際の画素で「背景色と絵を混ぜた色」に対する文字のコントラスト比を計算して決める
import { AA, ensureContrast, hexToRgb, lightness, luminance, luminanceRgb, rgbToHex, rgbToOklab, withLightness, type RGB } from "./color.js";
import type { PaletteColor } from "./palette.js";

/**
 * ターミナルの文字色は、背景色だけに対しては 7:1（WCAG AAA）を目標にする。
 * 背景に絵を薄く混ぜるとコントラストが下がるので、その余裕を先に取っておく（絵を混ぜた後は 4.5:1 を確かめる）
 */
export const TERMINAL_TARGET = 7;

export const ANSI_NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"] as const;
export type AnsiName = (typeof ANSI_NAMES)[number];

/** 基本の色の色相（OKLCH の角度、度） */
const TARGET_HUE: Record<Exclude<AnsiName, "black" | "white">, number> = {
  red: 29,
  yellow: 100,
  green: 142,
  cyan: 195,
  blue: 264,
  magenta: 328,
};

const hueOf = (hex: string) => {
  const [, a, b] = rgbToOklab(hexToRgb(hex));
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
};
const chromaOf = (hex: string) => {
  const [, a, b] = rgbToOklab(hexToRgb(hex));
  return Math.hypot(a, b);
};
const hueDistance = (x: number, y: number) => Math.min(Math.abs(x - y), 360 - Math.abs(x - y));

/** OKLCH から色を作る（色域に入らなければ彩度を下げる） */
function oklch(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const base = rgbToHex([0, 0, 0]);
  // withLightness は a, b を保って明るさを変えるので、先に a, b を決めた色を作ってから明るさを合わせる
  for (let k = 1; k >= 0; k -= 0.05) {
    const a = C * k * Math.cos(h);
    const b = C * k * Math.sin(h);
    const lin = [
      (L + 0.3963377774 * a + 0.2158037573 * b) ** 3,
      (L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
      (L - 0.0894841775 * a - 1.291485548 * b) ** 3,
    ];
    const rgb = [
      4.0767416621 * lin[0] - 3.3077115913 * lin[1] + 0.2309699292 * lin[2],
      -1.2684380046 * lin[0] + 2.6097574011 * lin[1] - 0.3413193965 * lin[2],
      -0.0041960863 * lin[0] - 0.7034186147 * lin[1] + 1.707614701 * lin[2],
    ];
    if (rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) {
      const toS = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055);
      return rgbToHex(rgb.map((v) => toS(Math.min(1, Math.max(0, v)))) as RGB);
    }
  }
  return withLightness(base, L);
}

export interface TerminalColors {
  normal: Record<AnsiName, string>;
  bright: Record<AnsiName, string>;
}

/**
 * 16色を作る。基本の色相から ±35°以内に十分鮮やかな絵の色があれば、その色相と彩度を使う。
 * なければ基本の色相のまま、彩度を絵全体の鮮やかさに合わせる（落ち着いた絵なら落ち着いた赤）
 */
export function ansiColors(palette: PaletteColor[], bg: string, fg: string, comment: string, dark: boolean): TerminalColors {
  const vivid = palette.filter((c) => c.chroma >= 0.04);
  const typicalChroma = Math.max(0.08, Math.min(0.14, [...palette].sort((a, b) => b.chroma - a.chroma)[Math.floor(palette.length / 3)]?.chroma * 1.6 || 0.1));
  const baseL = dark ? 0.72 : 0.5;
  const normal = {} as Record<AnsiName, string>;
  const bright = {} as Record<AnsiName, string>;
  for (const name of Object.keys(TARGET_HUE) as (keyof typeof TARGET_HUE)[]) {
    const target = TARGET_HUE[name];
    const match = vivid
      .filter((c) => hueDistance(hueOf(c.hex), target) <= 35)
      .sort((a, b) => hueDistance(hueOf(a.hex), target) - hueDistance(hueOf(b.hex), target))[0];
    const hue = match ? hueOf(match.hex) : target;
    const chroma = match ? Math.max(0.06, chromaOf(match.hex)) : typicalChroma;
    const color = ensureContrast(oklch(baseL, chroma, hue), bg, TERMINAL_TARGET);
    normal[name] = color;
    bright[name] = ensureContrast(withLightness(color, Math.min(0.95, Math.max(0.05, lightness(color) + (dark ? 0.08 : -0.08)))), bg, TERMINAL_TARGET);
  }
  // 黒と白：ダークなら「黒」は背景より少し明るい色（ls の色などで背景に使われる）、白は文字色
  normal.black = withLightness(bg, Math.min(1, Math.max(0, lightness(bg) + (dark ? 0.08 : -0.5))));
  bright.black = ensureContrast(comment, bg, TERMINAL_TARGET);
  normal.white = dark ? fg : withLightness(bg, Math.max(0, lightness(bg) - 0.08));
  bright.white = dark ? withLightness(fg, Math.min(0.98, lightness(fg) + 0.06)) : ensureContrast(fg, bg, TERMINAL_TARGET);
  return { normal, bright };
}

/** 背景色と絵の画素を、絵の濃さ opacity（0〜1）で混ぜた色（sRGB で単純に混ぜると仮定） */
export const blend = (bg: RGB, px: RGB, opacity: number): RGB =>
  [0, 1, 2].map((i) => bg[i] * (1 - opacity) + px[i] * opacity) as RGB;

export interface OpacityChoice {
  /** Warp に渡す濃さ（0〜100） */
  opacity: number;
  /** その濃さで、検査した文字色すべてが AA を満たした画素の割合（いちばん悪い文字色の値） */
  passRate: number;
}

/**
 * 絵をいちばん濃く見せつつ、検査する文字色すべてが、画素の minPass 以上で AA を満たす濃さを選ぶ。
 * 0 なら背景色だけ（必ず満たす）
 */
export function chooseOpacity(pixels: RGB[], bg: string, textColors: string[], minPass = 0.98): OpacityChoice {
  const bgRgb = hexToRgb(bg);
  const textL = textColors.map(luminance);
  const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const rate = (op: number) => {
    const mixed = pixels.map((px) => luminanceRgb(blend(bgRgb, px, op)));
    return Math.min(...textL.map((t) => mixed.filter((m) => ratio(t, m) >= AA).length / mixed.length));
  };
  for (let op = 60; op >= 5; op -= 5) {
    const r = rate(op / 100);
    if (r >= minPass) return { opacity: op, passRate: Math.round(r * 1000) / 1000 };
  }
  return { opacity: 0, passRate: 1 };
}

export interface WarpTheme {
  name: string;
  accent: string;
  cursor: string;
  background: string;
  foreground: string;
  details: "darker" | "lighter";
  background_image: { path: string; opacity: number };
  terminal_colors: TerminalColors;
}

/** Warp のテーマの YAML（ライブラリに頼らず、決まった形で書く） */
export function warpYaml(t: WarpTheme): string {
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const colors = (c: Record<AnsiName, string>) => ANSI_NAMES.map((n) => `    ${n}: ${q(c[n])}`).join("\n");
  return `# 名画テーマ（Masterpiece Theme）for Warp — https://github.com/zzzzico12/claude/tree/main/advent-2026/masterpiece-vscode-theme
name: ${q(t.name)}
accent: ${q(t.accent)}
cursor: ${q(t.cursor)}
background: ${q(t.background)}
foreground: ${q(t.foreground)}
details: ${t.details}
background_image:
  path: ${q(t.background_image.path)}
  opacity: ${t.background_image.opacity}
terminal_colors:
  normal:
${colors(t.terminal_colors.normal)}
  bright:
${colors(t.terminal_colors.bright)}
`;
}
