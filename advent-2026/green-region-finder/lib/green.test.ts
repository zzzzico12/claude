import { describe, expect, it } from "vitest";
import { estimateCarbon } from "./carbon.js";
import { distanceKm, distanceRttMs, estimateRtt, HUB_MIN_KM } from "./latency.js";
import { recommend } from "./recommend.js";
import { REGIONS } from "./regions.js";

const region = (provider: string, id: string) => REGIONS.find((r) => r.provider === provider && r.id === id)!;
const TOKYO = { lat: 35.68, lon: 139.69 };

describe("リージョンの一覧", () => {
  it("ID が重複していない", () => {
    const keys = REGIONS.map((r) => `${r.provider}:${r.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("米国のリージョンには州がある", () => {
    expect(REGIONS.filter((r) => r.iso3 === "USA" && !r.state)).toEqual([]);
  });
});

describe("CO2 の推定", () => {
  it("米国は州、それ以外は国の値を使う。Google Cloud は公式値も付く", () => {
    const oregon = estimateCarbon(region("gcp", "us-west1"))!;
    expect(oregon.basis).toBe("state");
    expect(oregon.official?.g).toBeGreaterThan(0);
    expect(estimateCarbon(region("aws", "ap-northeast-1"))!).toMatchObject({ basis: "country", official: null });
  });
  it("年を指定できる・国単位だけにもできる（評価用）", () => {
    const r = region("gcp", "us-west1");
    expect(estimateCarbon(r, { year: 2024 })!.year).toBe(2024);
    expect(estimateCarbon(r, { year: 2024, countryOnly: true })!.basis).toBe("country");
  });
});

describe("遅延の推定", () => {
  it("大円距離（東京〜ロンドン 約9,560km）", () => {
    expect(distanceKm(TOKYO, { lat: 51.51, lon: -0.13 })).toBeGreaterThan(9500);
    expect(distanceKm(TOKYO, { lat: 51.51, lon: -0.13 })).toBeLessThan(9620);
  });
  it("近い場所は距離だけで推定する", () => {
    const osaka = region("aws", "ap-northeast-3");
    const e = estimateRtt(TOKYO, osaka);
    expect(distanceKm(TOKYO, osaka)).toBeLessThan(HUB_MIN_KM);
    expect(e).toMatchObject({ method: "distance", ms: distanceRttMs(distanceKm(TOKYO, osaka)) });
  });
  it("遠い場所は Azure の実測値を中継する（東京〜スウェーデンは距離だけの推定の倍以上）", () => {
    const sweden = region("azure", "swedencentral");
    const e = estimateRtt(TOKYO, sweden);
    expect(e.method).toBe("hub");
    expect(e.via).toEqual(["japaneast", "swedencentral"]);
    expect(e.ms).toBeGreaterThan(2 * distanceRttMs(distanceKm(TOKYO, sweden)));
  });
  it("評価では、答えのリージョン自身を中継点に使わない", () => {
    const e = estimateRtt(region("azure", "japaneast"), region("azure", "swedencentral"), new Set(["japaneast", "swedencentral"]));
    expect(e.via).not.toContain("japaneast");
    expect(e.via).not.toContain("swedencentral");
  });
});

describe("提案", () => {
  it("遅延の条件を守り、CO2 の少ない順に並べる", () => {
    const r = recommend({ ...TOKYO, requirement: "web", providers: ["gcp", "aws", "azure"], countries: null });
    expect(r.ranked.every((c) => c.rttMs <= 150)).toBe(true);
    expect(r.ranked.map((c) => c.carbon.g)).toEqual([...r.ranked.map((c) => c.carbon.g)].sort((a, b) => a - b));
    expect(r.nearest?.region.iso3).toBe("JPN");
    expect(r.savings!.ratio).toBeGreaterThan(0);
  });
  it("置ける国を絞れる。公開されていないリージョンは出さない", () => {
    const r = recommend({ ...TOKYO, requirement: "batch", providers: ["gcp"], countries: ["USA"] });
    expect(r.ranked.every((c) => c.region.iso3 === "USA")).toBe(true);
    expect(r.ranked.some((c) => c.region.id === "us-central2")).toBe(false);
  });
});
