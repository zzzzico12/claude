import { describe, expect, it } from "vitest";
import { OBJECTS } from "../reference/objects.js";
import { allowedNumbers, AU_KM, diameterFromH, factsOf, r2, sizeComparisons, type Approach } from "./compare.js";
import { checkExplanation } from "./explain.js";
import { cdToIso, parseCad } from "./jpl.js";

const base: Approach = { des: "2026 WK3", fullname: "(2026 WK3)", time: "2026-11-28T10:50:00Z", timeSigma: "< 00:01", dist: 0.0038, distMin: 0.0038, distMax: 0.0038, vRel: 9.2, h: 27.6, diameter: null, diameterSigma: null };

describe("大きさの推定", () => {
  it("H=22 は反射率0.25で約106m、0.05で約237m（よく使われる目安「H=22 でおよそ110〜240m」）", () => {
    const d = diameterFromH(22);
    expect(d.min).toBeCloseTo(105.8, 1);
    expect(d.max).toBeCloseTo(236.6, 1);
  });
  it("有効数字2桁で丸める", () => {
    expect(r2(1234)).toBe(1200);
    expect(r2(0.8876)).toBe(0.89);
    expect(r2(26.4)).toBe(26);
  });
});

describe("比べ方", () => {
  it("比がおよそ1に近い物から並び、極端な比（1/30 未満・30 超）は出さない", () => {
    const c = sizeComparisons({ min: 300, max: 700 }, OBJECTS.objects);
    expect(c[0].name.ja).toBe("東京タワー");
    expect(c.every((x) => Math.sqrt(x.ratio.min * x.ratio.max) <= 30)).toBe(true);
    expect(c.find((x) => x.name.ja === "東京湾アクアライン")).toBeUndefined();
  });
  it("距離は月までの平均距離（Wikidata 384,400 km）の何倍、速さは新幹線 E5系（320 km/h）の何倍", () => {
    const f = factsOf({ ...base, dist: 384_400 / AU_KM, distMin: 384_400 / AU_KM, distMax: 384_400 / AU_KM, vRel: 320 / 3600 }, OBJECTS.objects);
    expect(f.distance.moon).toBe(1);
    expect(f.speed.shinkansen).toBe(1);
  });
  it("直径が測られていれば、その値を使う", () => {
    const f = factsOf({ ...base, diameter: 1.4, diameterSigma: null }, OBJECTS.objects);
    expect(f.size).toEqual({ min: 1400, max: 1400, measured: true });
  });
});

describe("JPL のデータ", () => {
  it("日時（2026-Dec-03 11:08）を ISO にし、列の名前で読む", () => {
    expect(cdToIso("2026-Dec-03 11:08")).toBe("2026-12-03T11:08:00Z");
    const rows = parseCad({ fields: ["des", "cd", "dist", "dist_min", "dist_max", "v_rel", "h", "diameter", "diameter_sigma", "fullname", "t_sigma_f"], data: [["2026 WK1", "2026-Dec-03 11:08", "0.0135", "0.0128", "0.0142", "6.33", "25.774", null, null, "       (2026 WK1)", "13:36"]] });
    expect(rows[0]).toMatchObject({ des: "2026 WK1", fullname: "(2026 WK1)", dist: 0.0135, h: 25.774, diameter: null });
  });
});

describe("AI の文章の照合", () => {
  const f = factsOf(base, OBJECTS.objects);
  const e = { headline: "2026 WK3 が通ります", size: `約${f.size.min}〜${f.size.max}m`, distance: `月までの約${f.distance.moon}倍`, speed: `新幹線の約${f.speed.shinkansen}倍`, calm: "これから100年、衝突の可能性は見つかっていません" };
  it("計算した数字だけなら通り、名前の中の数字（2026・WK3）は数えない", () => {
    expect(checkExplanation(e, base, f, null)).toEqual([]);
  });
  it("計算にない数字は ⚠", () => {
    expect(checkExplanation({ ...e, distance: "月までの約3.7倍" }, base, f, null)).toEqual(["3.7"]);
  });
  it("allowedNumbers に日本時間の時刻も入る", () => {
    expect(allowedNumbers(f, base)).toContain(19); // 10:50 UTC = 19:50 JST
  });
  it("名前の中の数字（2010 TH19 の 19）と、年の範囲（2087-2124）は数えない", () => {
    const a2 = { ...base, des: "499582", fullname: "499582 (2010 TH19)" };
    const f2 = factsOf(a2, OBJECTS.objects);
    const s = { des: "499582", ip: 0.0015891889, ts: 0, range: "2087-2124" };
    const e2 = { ...e, headline: "小惑星「499582 (2010 TH19)」が通ります", calm: "2087-2124年に約0.16%（約630分の1）。トリノ・スケールは0" };
    expect(checkExplanation(e2, a2, f2, s)).toEqual([]);
  });
});
