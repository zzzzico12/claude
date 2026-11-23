// Global Forest Watch（Global Nature Watch）の森林減少の地図タイルを、ブラウザで年ごとに塗り直す。
//
// タイル：https://tiles.globalforestwatch.org/umd_tree_cover_loss/v1.13/dynamic/{z}/{x}/{y}.png（キー不要、512px）
// 2026-11-23 に確かめたこと：
// - サーバー側の start_year / end_year は効かない（年を変えても同じ画像が返る）
// - 画素の色に情報が入っている：青（B）＝ 減少した年 − 2000、赤（R）＝ 濃さ（1〜255）、不透明度（A）＝ 255（減少なし は 0）
// - どのサイトからでも読める（access-control-allow-origin: *）。ブラウザに1年キャッシュされる
// そこで、画素を読み取って「選んだ年までの減少」だけを、年ごとの色で塗り直す（GFW の公式サイトと同じやり方）

export const GFW_VERSION = "v1.13";
export const FIRST_YEAR = 2001;
export const LAST_YEAR = 2025;

export const tileUrl = (z: number, x: number, y: number) =>
  `https://tiles.globalforestwatch.org/umd_tree_cover_loss/${GFW_VERSION}/dynamic/${z}/${x}/${y}.png`;

/** 年の色：古い年は黄色、新しい年ほど赤〜紫（選んだ年はいちばん明るく） */
export function yearColor(year: number, current: number): [number, number, number] {
  if (year === current) return [255, 40, 90];
  const t = (year - FIRST_YEAR) / Math.max(1, LAST_YEAR - FIRST_YEAR); // 0（古い）〜1（新しい）
  // 黄（255,210,60）→ 橙（245,120,40）→ 赤（200,30,40）
  const lerp = (a: number, b: number, u: number) => Math.round(a + (b - a) * u);
  if (t < 0.5) {
    const u = t / 0.5;
    return [lerp(255, 245, u), lerp(210, 120, u), lerp(60, 40, u)];
  }
  const u = (t - 0.5) / 0.5;
  return [lerp(245, 200, u), lerp(120, 30, u), lerp(40, 40, u)];
}

export interface DecodeOptions {
  /** この年までの減少を表示する */
  year: number;
  /** その年だけを表示する（false なら、2001年からその年までの合計） */
  onlyThisYear?: boolean;
}

/**
 * タイルの画素（RGBA、Uint8ClampedArray）を、年で絞って色を付けた画素に書き換える。
 * src は変更しない（年を変えるたびに元の画素から作り直すため）
 */
export function decodeTile(src: Uint8ClampedArray, out: Uint8ClampedArray, opts: DecodeOptions): number {
  let shown = 0;
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3];
    const lossYear = 2000 + src[i + 2];
    const visible =
      a > 0 && lossYear >= FIRST_YEAR && (opts.onlyThisYear ? lossYear === opts.year : lossYear <= opts.year);
    if (!visible) {
      out[i + 3] = 0;
      continue;
    }
    const [r, g, b] = yearColor(lossYear, opts.year);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    // 濃さ（R）を不透明度に。低い縮尺では1画素に減少が少しでもあれば見えるよう、下限を設ける
    out[i + 3] = Math.min(235, 90 + src[i] * 1.5);
    shown++;
  }
  return shown;
}
