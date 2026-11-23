import { describe, expect, it } from "vitest";
import { contrastRatio, hexToRgb, rgbToOklab, type RGB } from "./color.js";
import type { PaletteColor } from "./palette.js";
import { ansiColors, chooseOpacity, TERMINAL_TARGET, warpYaml } from "./terminal.js";

const hue = (hex: string) => {
  const [, a, b] = rgbToOklab(hexToRgb(hex));
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
};
const near = (h: number, target: number, tol = 45) => Math.min(Math.abs(h - target), 360 - Math.abs(h - target)) <= tol;
const palette: PaletteColor[] = [
  { hex: "#1d2c45", share: 0.4, lightness: 0.29, chroma: 0.06 },
  { hex: "#c5b398", share: 0.4, lightness: 0.78, chroma: 0.04 },
  { hex: "#a33a2a", share: 0.05, lightness: 0.5, chroma: 0.15, accent: true },
];

describe("ターミナルの16色", () => {
  const c = ansiColors(palette, "#14161c", "#e8e2d6", "#8a8a8a", true);
  it("赤・緑・青などは、基本の色相のまま（意味が変わらない）", () => {
    expect(near(hue(c.normal.red), 29)).toBe(true);
    expect(near(hue(c.normal.green), 142)).toBe(true);
    expect(near(hue(c.normal.blue), 264)).toBe(true);
  });
  it("文字に使う色は、背景に対して 7:1 以上（絵を混ぜる余裕）", () => {
    for (const n of ["red", "green", "yellow", "blue", "magenta", "cyan"] as const) {
      expect(contrastRatio(c.normal[n], "#14161c")).toBeGreaterThanOrEqual(TERMINAL_TARGET - 1e-9);
    }
  });
});

describe("背景に敷く絵の濃さ", () => {
  it("明るい画素が多い絵ほど、ダークの背景では薄くする", () => {
    const darkPixels: RGB[] = Array.from({ length: 100 }, () => [20, 25, 35]);
    const brightPixels: RGB[] = Array.from({ length: 100 }, () => [240, 235, 220]);
    const text = ["#e8e2d6"];
    expect(chooseOpacity(darkPixels, "#14161c", text).opacity).toBeGreaterThan(chooseOpacity(brightPixels, "#14161c", text).opacity);
  });
  it("基準を満たせなければ 0（絵を敷かない）", () => {
    expect(chooseOpacity([[255, 255, 255]], "#000000", ["#777777"]).opacity).toBe(0);
  });
});

describe("Warp の YAML", () => {
  it("必要なキーがそろい、名前の引用符をエスケープする", () => {
    const c = ansiColors(palette, "#14161c", "#e8e2d6", "#8a8a8a", true);
    const y = warpYaml({ name: "名画: it's", accent: "#123456", cursor: "#123456", background: "#14161c", foreground: "#e8e2d6", details: "darker", background_image: { path: "a.jpg", opacity: 20 }, terminal_colors: c });
    expect(y).toContain("name: '名画: it''s'");
    expect(y).toMatch(/background_image:\n  path: 'a\.jpg'\n  opacity: 20/);
    expect(y.match(/^    (black|red|green|yellow|blue|magenta|cyan|white): '#[0-9a-f]{6}'$/gm)).toHaveLength(16);
  });
});
