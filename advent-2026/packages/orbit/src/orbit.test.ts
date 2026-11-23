import { describe, expect, it } from "vitest";
import { apply, compactGp, expandGp, geodetic, j2000ToTeme, orbitSummary, positionsEcf, regimeOf, toSatrec, type Gp } from "./index.js";

const ISS = {"OBJECT_NAME": "ISS (ZARYA)", "OBJECT_ID": "1998-067A", "EPOCH": "2026-11-23T04:53:05.579520", "MEAN_MOTION": 15.49560282, "ECCENTRICITY": 0.00074255, "INCLINATION": 51.632, "RA_OF_ASC_NODE": 233.1644, "ARG_OF_PERICENTER": 56.0849, "MEAN_ANOMALY": 304.0845, "EPHEMERIS_TYPE": 0, "CLASSIFICATION_TYPE": "U", "NORAD_CAT_ID": 25544, "ELEMENT_SET_NO": 999, "REV_AT_EPOCH": 59640, "BSTAR": 0.00013417746, "MEAN_MOTION_DOT": 7.096e-05, "MEAN_MOTION_DDOT": 0};
const HIMAWARI9 = {"OBJECT_NAME": "HIMAWARI-9", "OBJECT_ID": "2016-064A", "EPOCH": "2026-11-23T07:10:31.045152", "MEAN_MOTION": 1.00270437, "ECCENTRICITY": 0.00015441, "INCLINATION": 0.0265, "RA_OF_ASC_NODE": 14.2845, "ARG_OF_PERICENTER": 233.4298, "MEAN_ANOMALY": 62.9788, "EPHEMERIS_TYPE": 0, "CLASSIFICATION_TYPE": "U", "NORAD_CAT_ID": 41836, "ELEMENT_SET_NO": 999, "REV_AT_EPOCH": 3680, "BSTAR": 0, "MEAN_MOTION_DOT": -2.52e-06, "MEAN_MOTION_DDOT": 0};
const T = new Date("2026-11-23T06:00:00Z");

describe("GP の受け渡し", () => {
  it("表の形にして戻すと、計算に要る項目が同じになる", () => {
    const [gp] = expandGp(JSON.parse(JSON.stringify(compactGp([ISS], "test"))));
    expect(gp.NORAD_CAT_ID).toBe(25544);
    expect(gp.EPOCH).toBe(ISS.EPOCH);
    expect(toSatrec(gp)).not.toBeNull();
  });
});

describe("軌道の形", () => {
  it("ISS は約93分で1周、高さ約400km の低軌道", () => {
    const o = orbitSummary(ISS);
    expect(o.periodMin).toBeCloseTo(92.9, 1);
    expect(o.perigeeKm).toBeGreaterThan(380);
    expect(o.apogeeKm).toBeLessThan(450);
    expect(o.regime).toBe("低軌道");
  });
  it("ひまわり9号は静止軌道（高さ約3万5800km）", () => {
    const o = orbitSummary(HIMAWARI9);
    expect(o.regime).toBe("静止軌道");
    expect(o.apogeeKm).toBeGreaterThan(35700);
    expect(o.apogeeKm).toBeLessThan(35900);
  });
  it("GPS（約12時間で1周）は中軌道、離心率の大きいものは長楕円軌道", () => {
    expect(regimeOf(718, 0.01, 20200)).toBe("中軌道");
    expect(regimeOf(718, 0.7, 39000)).toBe("長楕円軌道");
  });
  it("1周が約1日でも、傾いている みちびき は傾斜対地同期軌道", () => {
    expect(regimeOf(1436, 0.075, 38950, 39)).toBe("傾斜対地同期軌道");
    expect(regimeOf(1436, 0.0002, 35790, 0.03)).toBe("静止軌道");
  });
});

describe("位置", () => {
  it("ひまわり9号は東経140度あたりの赤道上に止まって見える", () => {
    const g = geodetic(toSatrec(HIMAWARI9 as unknown as Gp)!, T)!;
    expect(Math.abs(g.lat)).toBeLessThan(0.2);
    expect(g.lon).toBeGreaterThan(139);
    expect(g.lon).toBeLessThan(142);
  });
  it("まとめて計算すると、ISS は地球の中心から約6780km", () => {
    const out = new Float64Array(6);
    const n = positionsEcf([toSatrec(ISS as unknown as Gp), null], T, out);
    expect(n).toBe(1);
    expect(Math.hypot(out[0], out[1], out[2])).toBeGreaterThan(6750);
    expect(Math.hypot(out[0], out[1], out[2])).toBeLessThan(6830);
    expect(Number.isNaN(out[3])).toBe(true);
  });
});

describe("J2000 → TEME", () => {
  it("2000年1月1日12時（J2000 の基準）では、ほぼ回転しない（章動の分だけ）", () => {
    const v = apply(j2000ToTeme(new Date("2000-01-01T12:00:00Z")), { x: 7000, y: 0, z: 0 });
    expect(Math.hypot(v.x - 7000, v.y, v.z)).toBeLessThan(1); // 章動は最大 20 秒角弱 → 7000km で 0.7km 未満
  });
  it("2026年では歳差で約0.37度回り、長さは変わらない", () => {
    const v = apply(j2000ToTeme(new Date("2026-11-23T00:00:00Z")), { x: 7000, y: 0, z: 0 });
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(7000, 6);
    const deg = (Math.acos(v.x / 7000) * 180) / Math.PI;
    expect(deg).toBeGreaterThan(0.3);
    expect(deg).toBeLessThan(0.45);
  });
  it("北極の向きは、歳差で約0.15度（θ）傾く（回転軸を間違えると傾かない）", () => {
    const v = apply(j2000ToTeme(new Date("2026-11-23T00:00:00Z")), { x: 0, y: 0, z: 7000 });
    const deg = (Math.acos(v.z / 7000) * 180) / Math.PI;
    expect(deg).toBeGreaterThan(0.13);
    expect(deg).toBeLessThan(0.17);
  });
});
