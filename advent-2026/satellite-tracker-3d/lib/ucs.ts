// UCS Satellite Database（2023年5月1日版）の読み取り。
// UCS には明示のライセンスがないので、まとめたファイルは配らない：
//   - リポジトリにも public/ にも入れない（server-data/ は Git 管理外）
//   - Vercel ではビルドのときに UCS から取得して server-data/ucs.json を作り、API が1機ずつ返す
import type { UcsRecord } from "./facts.js";

export const UCS_URL = "https://www.ucs.org/media/11493";
export const UCS_FILE = "UCS-Satellite-Database-5-1-2023.txt";
/** サーバーだけが読む、UCS の項目（NORAD 番号 → 項目） */
export const UCS_JSON = "server-data/ucs.json";

/** タブ区切り・Latin-1 の UCS のテキストを、NORAD 番号ごとの項目にする */
export function parseUcs(text: string): Map<number, UcsRecord> {
  const [head, ...rows] = text.split(/\r?\n/).map((l) => l.split("\t"));
  const col = (name: string) => head.findIndex((h) => h.trim() === name);
  const C = {
    name: col("Current Official Name of Satellite"),
    country: col("Country of Operator/Owner"),
    operator: col("Operator/Owner"),
    users: col("Users"),
    purpose: col("Purpose"),
    detailed: col("Detailed Purpose"),
    launchMass: col("Launch Mass (kg.)"),
    lifetime: col("Expected Lifetime (yrs.)"),
    contractor: col("Contractor"),
    contractorCountry: col("Country of Contractor"),
    vehicle: col("Launch Vehicle"),
    norad: col("NORAD Number"),
    comments: col("Comments"),
  };
  if (C.norad < 0 || C.purpose < 0) throw new Error("UCS のファイルの列が想定と違います");
  // タブ区切りだが、「,」を含む値は "4,000" のように引用符で囲まれている。Ê は改行しない空白の名残
  const clean = (s: string | undefined) =>
    (s ?? "").replace(/Ê/g, " ").replace(/^"(.*)"$/s, "$1").replace(/""/g, '"').replace(/\s+/g, " ").trim();
  // 数字の項目は「4,000」→「4000」にする（AI に渡す事実と、解説の数字の照合をそろえる）
  const num = (s: string | undefined) => clean(s).replace(/,/g, "");
  const out = new Map<number, UcsRecord>();
  for (const r of rows) {
    const id = Number(r[C.norad]);
    if (!id) continue;
    out.set(id, {
      name: clean(r[C.name]),
      country: clean(r[C.country]),
      operator: clean(r[C.operator]),
      users: clean(r[C.users]),
      purpose: clean(r[C.purpose]),
      detailedPurpose: clean(r[C.detailed]),
      launchMassKg: num(r[C.launchMass]),
      expectedLifetimeYears: num(r[C.lifetime]),
      contractor: clean(r[C.contractor]),
      contractorCountry: clean(r[C.contractorCountry]),
      launchVehicle: clean(r[C.vehicle]),
      comments: clean(r[C.comments]),
    });
  }
  return out;
}
