import type { Gp } from "@advent/orbit";
import { describe, expect, it } from "vitest";
import { unmatched } from "./ask.js";
import { findSatellite } from "./gp-source.js";
import { localIso, predict, score } from "./predict.js";
import { cloudAt, type Clouds } from "./weather.js";

const ISS: Gp = { NORAD_CAT_ID: 25544, OBJECT_NAME: "ISS (ZARYA)", OBJECT_ID: "1998-067A", EPOCH: "2026-11-23T04:53:05.579520", MEAN_MOTION: 15.49560282, ECCENTRICITY: 0.00074255, INCLINATION: 51.632, RA_OF_ASC_NODE: 233.1644, ARG_OF_PERICENTER: 56.0849, MEAN_ANOMALY: 304.0845, BSTAR: 0.00013417746, MEAN_MOTION_DOT: 7.096e-5, MEAN_MOTION_DDOT: 0, ELEMENT_SET_NO: 999 };
const CSS: Gp = { ...ISS, NORAD_CAT_ID: 48274, OBJECT_NAME: "CSS (TIANHE)" };
const HST: Gp = { ...ISS, NORAD_CAT_ID: 20580, OBJECT_NAME: "HST" };

describe("見やすさの点数", () => {
  it("真上・快晴・6分以上で100点。雲は掛け算で効き、予報がないときは雲量50%とみなす", () => {
    expect(score({ maxElevation: 90, cloudCover: 0, durationSec: 400 })).toBe(100);
    expect(score({ maxElevation: 90, cloudCover: null, durationSec: 400 })).toBe(55);
    expect(score({ maxElevation: 10, cloudCover: 100, durationSec: 0 })).toBe(1);
  });
  it("雲量98%の真上の通過より、快晴の30度の通過が上になる（ロンドンで1位が曇りだった反省）", () => {
    const overheadCloudy = score({ maxElevation: 86, cloudCover: 98, durationSec: 400 });
    const lowClear = score({ maxElevation: 30, cloudCover: 0, durationSec: 200 });
    expect(lowClear).toBeGreaterThan(overheadCloudy);
  });
});

describe("時刻", () => {
  it("観測地の時刻を時差つきで書く", () => {
    expect(localIso(new Date("2026-11-28T09:12:05Z"), 9 * 3600)).toBe("2026-11-28T18:12:05+09:00");
    expect(localIso(new Date("2026-11-28T09:12:05Z"), -5.5 * 3600)).toBe("2026-11-28T03:42:05-05:30");
  });
  it("雲量は、いちばん近い1時間の値（45分より離れていれば null）", () => {
    const c: Clouds = { timezone: "UTC", utcOffsetSeconds: 0, hours: [[Date.parse("2026-11-28T09:00Z"), 20], [Date.parse("2026-11-28T10:00Z"), 80]] };
    expect(cloudAt(c, Date.parse("2026-11-28T09:20Z"))).toBe(20);
    expect(cloudAt(c, Date.parse("2026-11-28T09:40Z"))).toBe(80);
    expect(cloudAt(c, Date.parse("2026-11-28T12:00Z"))).toBeNull();
  });
});

describe("衛星を探す", () => {
  const all = [ISS, CSS, HST];
  it("名前・言い換え・番号で見つかる。指定がなければ ISS", () => {
    expect(findSatellite(all, null)?.NORAD_CAT_ID).toBe(25544);
    expect(findSatellite(all, "天宮")?.NORAD_CAT_ID).toBe(48274);
    expect(findSatellite(all, "Tiangong")?.NORAD_CAT_ID).toBe(48274);
    expect(findSatellite(all, "ハッブル")?.NORAD_CAT_ID).toBe(20580);
    expect(findSatellite(all, "20580")?.OBJECT_NAME).toBe("HST");
    expect(findSatellite(all, "存在しない衛星")).toBeUndefined();
  });
});

describe("予測", () => {
  it("順位は点数の高い順に 1 から付き、並びは時刻順", () => {
    const c: Clouds = { timezone: "Asia/Tokyo", utcOffsetSeconds: 9 * 3600, hours: [] };
    const p = predict(ISS, 35.68, 139.69, 7, c, new Date("2026-11-24T00:00Z"));
    expect(p.passes.length).toBeGreaterThan(0);
    expect(p.passes.map((x) => x.rank).sort((a, b) => a - b)).toEqual(p.passes.map((_, i) => i + 1));
    const times = p.passes.map((x) => x.start.time);
    expect([...times].sort()).toEqual(times);
    const best = p.passes.find((x) => x.rank === 1)!;
    expect(p.passes.every((x) => x.score <= best.score)).toBe(true);
    expect(best.start.localTime.endsWith("+09:00")).toBe(true);
  });
});

describe("答えの数字の照合", () => {
  const facts = { topPasses: [{ appears: "11/29(日) 17:22", highestElevationDeg: 85, cloudCoverPercent: 57, visibleMinutes: 5.4 }] };
  it("事実にある数字は通り、ない数字は ⚠", () => {
    expect(unmatched("11/29(日) 17:22 に現れ、高さ85度、雲量57%、5.4分見えます。", facts)).toEqual([]);
    expect(unmatched("高さ88度まで上がります。", facts)).toEqual(["88"]);
  });
  it("衛星の名前の番号や、10以下の整数は照合しない", () => {
    expect(unmatched("NOAA 20 は 5分前に外へ。", facts)).toEqual([]);
  });
});
