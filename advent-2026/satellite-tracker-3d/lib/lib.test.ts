import { describe, expect, it } from "vitest";
import { categoryFromName, categoryFromUcs } from "./category.js";
import { factsOf, type Catalog } from "./facts.js";

describe("種類", () => {
  it("名前から決める", () => {
    expect(categoryFromName("STARLINK-1008")).toBe("starlink");
    expect(categoryFromName("ISS (ZARYA)")).toBe("station");
    expect(categoryFromName("QZS-2 (MICHIBIKI-2)")).toBe("navigation");
    expect(categoryFromName("HIMAWARI-9")).toBe("weather");
    expect(categoryFromName("KUIPER-00008")).toBe("constellation");
    expect(categoryFromName("2026-123A")).toBe("other");
  });
  it("UCS の Purpose から決める", () => {
    expect(categoryFromUcs("Navigation/Regional Positioning")).toBe("navigation");
    expect(categoryFromUcs("Earth Observation")).toBe("earth");
    expect(categoryFromUcs("Communications")).toBe("comms");
    expect(categoryFromUcs("")).toBeNull();
  });
});

describe("AI に渡す事実", () => {
  const ISS = { NORAD_CAT_ID: 25544, OBJECT_NAME: "ISS (ZARYA)", OBJECT_ID: "1998-067A", EPOCH: "2026-11-23T04:53:05.579520", MEAN_MOTION: 15.49560282, ECCENTRICITY: 0.00074255, INCLINATION: 51.632, RA_OF_ASC_NODE: 233.1644, ARG_OF_PERICENTER: 56.0849, MEAN_ANOMALY: 304.0845, BSTAR: 0.00013417746, MEAN_MOTION_DOT: 7.096e-5, MEAN_MOTION_DDOT: 0, ELEMENT_SET_NO: 999 };
  const catalog: Catalog = { builtAt: "2026-11-23", ucsVersion: "2023-05-01", categories: [], owners: { ISS: "International Space Station" }, sats: { "25544": [6, "ISS", "1998-11-20"], "1": [0, "US", ""] } };
  it("軌道の数字はコードで計算し、丸めて渡す", () => {
    const f = factsOf(ISS, catalog, undefined, new Date("2026-11-24T04:53:05Z"));
    expect(f.種類).toBe("宇宙ステーション・有人");
    expect(f.所有者).toBe("国際宇宙ステーション（各国の共同）（ISS）");
    expect(f.軌道["1周の時間_分"]).toBe(92.9);
    expect(f.軌道.区分).toBe("低軌道");
    expect(f["軌道要素の古さ_日"]).toBe(1);
    expect(f.同じ種類の稼働中の衛星の数).toBe(1);
    expect(f.UCS).toContain("載っていない");
  });
});
