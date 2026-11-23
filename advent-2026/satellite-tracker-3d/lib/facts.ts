// 衛星の事実（コードが用意する数字と項目）。画面の表示と、AI に渡す事実の両方に使う
import { ageDays, orbitSummary, type Gp } from "@advent/orbit";
import { CATEGORIES } from "./category.js";
import { OWNER_JA } from "./owners.js";

export interface Catalog {
  builtAt: string;
  ucsVersion: string;
  categories: string[];
  owners: Record<string, string>;
  sats: Record<string, [number, string, string]>;
}
export type UcsRecord = Record<string, string>;

const round = (x: number, d = 0) => Math.round(x * 10 ** d) / 10 ** d;

export function factsOf(gp: Gp, catalog: Catalog, ucs: UcsRecord | undefined, now = new Date()) {
  const c = catalog.sats[String(gp.NORAD_CAT_ID)];
  const o = orbitSummary(gp);
  const owner = c?.[1] ?? "";
  return {
    名前: gp.OBJECT_NAME,
    NORAD番号: gp.NORAD_CAT_ID,
    国際標識: gp.OBJECT_ID,
    種類: c ? CATEGORIES[c[0]]?.label : "（カタログ作成後に打ち上げられた衛星）",
    同じ種類の稼働中の衛星の数: c ? Object.values(catalog.sats).filter((v) => v[0] === c[0]).length : "不明",
    "カタログ全体の稼働中の衛星の数": Object.keys(catalog.sats).length,
    所有者: owner ? `${OWNER_JA[owner] ?? catalog.owners[owner] ?? owner}（${owner}）` : "不明",
    打ち上げ日: c?.[2] || "不明",
    軌道: {
      区分: o.regime,
      "高さ_近地点_km": round(o.perigeeKm),
      "高さ_遠地点_km": round(o.apogeeKm),
      "1周の時間_分": round(o.periodMin, 1),
      "軌道傾斜角_度": round(o.inclinationDeg, 1),
      "1日の周回数": round(1440 / o.periodMin, 1),
    },
    軌道要素の日時: gp.EPOCH.slice(0, 16).replace("T", " ") + " UTC",
    "軌道要素の古さ_日": round(ageDays(gp, now), 1),
    UCS: ucs
      ? {
          版: `${catalog.ucsVersion}（これ以降の変化は反映されていない）`,
          運用者の国: ucs.country,
          運用者: ucs.operator,
          利用者: ucs.users,
          目的: ucs.purpose,
          詳しい目的: ucs.detailedPurpose,
          "打ち上げ時の重さ_kg": ucs.launchMassKg,
          "設計寿命_年": ucs.expectedLifetimeYears,
          製造: ucs.contractor && `${ucs.contractor}（${ucs.contractorCountry}）`,
          ロケット: ucs.launchVehicle,
          備考: ucs.comments,
        }
      : `載っていない（UCS は ${catalog.ucsVersion} 版で更新が止まっている。それ以降の打ち上げや、載せていない衛星）`,
  };
}
