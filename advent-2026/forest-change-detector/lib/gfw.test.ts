import { describe, expect, it } from "vitest";
import { decodeTile, LAST_YEAR, tileUrl, yearColor } from "./gfw.js";

// 1画素 = [R(濃さ), G, B(年-2000), A]
const px = (...pixels: [number, number, number, number][]) => new Uint8ClampedArray(pixels.flat());

describe("GFW のタイルの読み取り", () => {
  const src = px([200, 0, 5, 255], [100, 0, 20, 255], [50, 0, 25, 255], [0, 0, 0, 0]);

  it("選んだ年までの減少だけを表示する（2005年・2020年・2025年の減少のうち、2020年までなら2つ）", () => {
    const out = new Uint8ClampedArray(src.length);
    expect(decodeTile(src, out, { year: 2020 })).toBe(2);
    expect(out[3]).toBeGreaterThan(0);
    expect(out[7]).toBeGreaterThan(0);
    expect(out[11]).toBe(0); // 2025年は表示しない
    expect(out[15]).toBe(0); // 減少なし
  });

  it("「その年だけ」にできる", () => {
    const out = new Uint8ClampedArray(src.length);
    expect(decodeTile(src, out, { year: 2025, onlyThisYear: true })).toBe(1);
  });

  it("元の画素は書き換えない", () => {
    const copy = new Uint8ClampedArray(src);
    decodeTile(src, new Uint8ClampedArray(src.length), { year: 2010 });
    expect(src).toEqual(copy);
  });

  it("濃さが小さい画素は表示しない。濃いほど不透明", () => {
    const faint = px([2, 0, 10, 255], [20, 0, 10, 255], [200, 0, 10, 255]);
    const out = new Uint8ClampedArray(faint.length);
    expect(decodeTile(faint, out, { year: 2025 })).toBe(2);
    expect(out[3]).toBe(0);
    expect(out[11]).toBeGreaterThan(out[7]);
  });

  it("選んだ年は目立つ色、古い年は黄色寄り", () => {
    expect(yearColor(2020, 2020)).toEqual([255, 40, 90]);
    const old = yearColor(2001, LAST_YEAR);
    const recent = yearColor(2024, LAST_YEAR);
    expect(old[1]).toBeGreaterThan(recent[1]); // 緑の成分が多い＝黄色寄り
  });

  it("タイルの URL（キー不要、v1.13）", () => {
    expect(tileUrl(5, 10, 16)).toBe("https://tiles.globalforestwatch.org/umd_tree_cover_loss/v1.13/dynamic/5/10/16.png");
  });
});
