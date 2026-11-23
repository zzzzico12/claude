import jpeg from "jpeg-js";
import { describe, expect, it } from "vitest";
import { AA, colorDifference, contrastRatio, deltaE2000, ensureContrast } from "./color.js";
import { extractPalette } from "./palette.js";
import { moodOf, pickPainting, type PaintingInfo } from "./paintings.js";
import { buildTheme, separate } from "./theme.js";

describe("色の計算", () => {
  it("コントラスト比：白と黒は21、同じ色は1", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });
  it("ΔE2000：Sharma らの検証データの1組目と一致", () => {
    expect(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
  });
  it("ensureContrast：基準を満たすまで明るさだけを動かす（満たしていれば変えない）", () => {
    const adjusted = ensureContrast("#556677", "#1e1e1e");
    expect(contrastRatio(adjusted, "#1e1e1e")).toBeGreaterThanOrEqual(AA);
    expect(ensureContrast("#eeeeee", "#111111")).toBe("#eeeeee");
  });
  it("separate：似すぎた色を離す（背景から遠ざける）", () => {
    const [a, b] = separate(["#858877", "#83897b"], true);
    expect(colorDifference(a, b)).toBeGreaterThanOrEqual(8);
  });
});

describe("テーマ", () => {
  it("すべての文字と背景の組が AA を満たす（灰色ばかりの悪い割り当てでも）", () => {
    const built = buildTheme("t", {
      type: "dark", background: "#45483d", foreground: "#565a4f", accent: "#7c7f6e", keyword: "#565a4f",
      string: "#565a4f", number: "#565a4f", function: "#565a4f", type_: "#565a4f", comment: "#565a4f",
    });
    for (const p of built.pairs) expect(contrastRatio(p.fg, p.bg)).toBeGreaterThanOrEqual(AA - 1e-9);
  });
});

describe("パレット", () => {
  // 左半分が紺、右半分がベージュで、右下に小さな赤い点がある画像を作る
  const w = 80, h = 80;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const red = x > 70 && y > 70;
      const [r, g, b] = red ? [200, 30, 30] : x < w / 2 ? [20, 30, 70] : [220, 210, 180];
      data.set([r, g, b, 255], i);
    }
  const img = jpeg.encode({ data, width: w, height: h }, 95).data;

  it("同じ画像からは毎回同じパレット", () => {
    expect(extractPalette(img, 4, 2)).toEqual(extractPalette(img, 4, 2));
  });
  it("面積の大きい色と、小さく鮮やかな色（accent）を取り出す", () => {
    const p = extractPalette(img, 2, 2); // 大きい色は2つ（紺・ベージュ）なので、赤は accent として出てくるはず
    expect(p[0].share).toBeGreaterThan(0.3);
    expect(p.some((c) => c.accent && c.chroma > 0.15)).toBe(true);
  });
});

describe("天気と時間帯", () => {
  const base = { code: 0, windKmh: 5, isDay: true, minutesFromSunrise: 300, minutesToSunset: 300 };
  it("嵐 → 雪 → 雨 → 朝・夕方 → 夜 → くもり → 晴れ の順に決める", () => {
    expect(moodOf({ ...base, code: 61, windKmh: 50 })).toBe("storm");
    expect(moodOf({ ...base, code: 73 })).toBe("snow");
    expect(moodOf({ ...base, code: 63, minutesFromSunrise: 10 })).toBe("rain");
    expect(moodOf({ ...base, minutesFromSunrise: 20 })).toBe("dawn");
    expect(moodOf({ ...base, minutesToSunset: 30 })).toBe("dusk");
    expect(moodOf({ ...base, isDay: false, minutesFromSunrise: null, minutesToSunset: null })).toBe("night");
    expect(moodOf({ ...base, code: 3 })).toBe("cloudy");
    expect(moodOf(base)).toBe("clear");
  });
  it("合う絵がなければ近い雰囲気の絵。合う絵が複数なら日替わり", () => {
    const p = (slug: string, moods: PaintingInfo["moods"]) => ({ slug, moods }) as PaintingInfo;
    const list = [p("a", ["clear"]), p("b", ["clear"]), p("c", ["night"])];
    expect(pickPainting(list, "clear", 0).painting.slug).toBe("a");
    expect(pickPainting(list, "clear", 1).painting.slug).toBe("b");
    expect(pickPainting(list, "dusk", 0)).toMatchObject({ matched: "night" });
  });
});
