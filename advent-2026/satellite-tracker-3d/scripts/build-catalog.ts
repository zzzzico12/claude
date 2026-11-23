// 衛星の素性（国・種類・打ち上げ日・UCS の目的など）を、事前に JSON にまとめる
//   pnpm catalog
// 取得したものは data/（Git 管理外）に日付つきで保存し、2回目からは使い回す。
// CelesTrak には、小さな分類（GROUP）を1つずつ、2秒ずつ間をあけて取りに行く（大きな active と starlink は取らない）
//
// 書き出すもの：
//   public/data/catalog.json  … 全衛星の [種類, 所有者コード, 打ち上げ日]。絞り込みと色分けに使う
//   public/data/ucs.json      … UCS に載っている衛星の、目的・利用者・運用者など（クリックしたときに表示）
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, CATEGORY_INDEX, categoryFromName, categoryFromUcs, GROUP_CATEGORY, type CategoryId } from "../lib/category.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(appDir, "data");
const outDir = join(appDir, "public", "data");
const UA = "advent-2026-satellite-tracker (https://github.com/zzzzico12/claude)";
const today = new Date().toISOString().slice(0, 10);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 同じ名前で保存したものがあれば使い回す。なければ取得して保存する */
async function cached(path: string, url: string, wait = 2000): Promise<string> {
  if (existsSync(path)) return readFileSync(path, "latin1");
  mkdirSync(dirname(path), { recursive: true });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} が HTTP ${res.status} を返しました`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  await sleep(wait);
  return buf.toString("latin1");
}

/** いちばん新しい日付の保存ファイル（なければ null） */
function latest(dir: string, prefix: string): string | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.startsWith(prefix)).sort();
  return files.length ? join(dir, files.at(-1)!) : null;
}

function parseCsv(text: string): Record<string, string>[] {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split(",");
  return lines.map((l) => {
    // SATCAT の CSV は、名前に「,」が入るときだけ "" で囲む
    const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? ""]));
  });
}

async function main() {
  // 1. 稼働中の衛星の一覧（画面と同じ CelesTrak の active）。手元の data/ にあるものを使う（なければ1回だけ取る）
  const activePath = latest(join(dataDir, "celestrak"), "active-") ?? join(dataDir, "celestrak", `active-${today}.json`);
  const active = JSON.parse(await cached(activePath, "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json")) as {
    NORAD_CAT_ID: number;
    OBJECT_NAME: string;
  }[];

  // 2. SATCAT（所有者・打ち上げ日）と、所有者コードの名前
  const satcatPath = latest(join(dataDir, "celestrak"), "satcat-") ?? join(dataDir, "celestrak", `satcat-${today}.csv`);
  const satcat = new Map(parseCsv(await cached(satcatPath, "https://celestrak.org/pub/satcat.csv")).map((r) => [Number(r.NORAD_CAT_ID), r]));
  const sourcesHtml = await cached(join(dataDir, "celestrak", "sources.html"), "https://celestrak.org/satcat/sources.php");
  const ownerNames: Record<string, string> = {};
  for (const row of sourcesHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&uuml;/g, "ü").replace(/&amp;/g, "&").trim());
    if (cells.length >= 2 && cells[0] !== "Source Code") ownerNames[cells[0]] = cells[1];
  }

  // 3. CelesTrak の分類（小さな GROUP だけ。CSV の NORAD 番号だけ使う）
  const groupOf = new Map<number, string[]>();
  for (const [group] of GROUP_CATEGORY) {
    const csv = await cached(join(dataDir, "celestrak", "groups", `${group}.csv`), `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=csv`);
    if (!csv.startsWith("OBJECT_NAME")) throw new Error(`GROUP=${group} が CSV ではありません：${csv.slice(0, 100)}`);
    for (const r of parseCsv(csv)) {
      const id = Number(r.NORAD_CAT_ID);
      groupOf.set(id, [...(groupOf.get(id) ?? []), group]);
    }
    process.stderr.write(".");
  }
  process.stderr.write("\n");

  // 4. UCS Satellite Database（2023年5月1日版。タブ区切り、Latin-1）
  const ucsText = await cached(join(dataDir, "ucs", "UCS-Satellite-Database-5-1-2023.txt"), "https://www.ucs.org/media/11493");
  const [ucsHead, ...ucsRows] = ucsText.split(/\r?\n/).map((l) => l.split("\t"));
  const col = (name: string) => ucsHead.findIndex((h) => h.trim() === name);
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
  // タブ区切りだが、「,」を含む値は "4,000" のように引用符で囲まれている。Ê は改行しない空白の名残
  const clean = (s: string | undefined) =>
    (s ?? "").replace(/Ê/g, " ").replace(/^"(.*)"$/s, "$1").replace(/""/g, '"').replace(/\s+/g, " ").trim();
  // 数字の項目は「4,000」→「4000」にする（AI に渡す事実と、解説の数字の照合をそろえる）
  const num = (s: string | undefined) => clean(s).replace(/,/g, "");
  const ucs = new Map<number, Record<string, string>>();
  for (const r of ucsRows) {
    const id = Number(r[C.norad]);
    if (!id) continue;
    ucs.set(id, {
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

  // 5. 結びつける
  const STRONG_BY_NAME: CategoryId[] = ["station", "starlink", "constellation"];
  const sats: Record<number, [number, string, string]> = {};
  const ucsOut: Record<number, Record<string, string>> = {};
  const how = { group: 0, ucs: 0, name: 0 };
  const counts = new Map<CategoryId, number>();
  for (const s of active) {
    const id = s.NORAD_CAT_ID;
    const groups = groupOf.get(id) ?? [];
    const byGroup = GROUP_CATEGORY.find(([g]) => groups.includes(g))?.[1];
    const byName = categoryFromName(s.OBJECT_NAME);
    const u = ucs.get(id);
    let cat: CategoryId;
    if (byGroup) (cat = byGroup), how.group++;
    else if (STRONG_BY_NAME.includes(byName)) (cat = byName), how.name++;
    else if (u && categoryFromUcs(u.purpose)) (cat = categoryFromUcs(u.purpose)!), how.ucs++;
    else (cat = byName), how.name++;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
    const sc = satcat.get(id);
    sats[id] = [CATEGORY_INDEX[cat], sc?.OWNER ?? "", sc?.LAUNCH_DATE ?? ""];
    if (u) ucsOut[id] = u;
  }

  mkdirSync(outDir, { recursive: true });
  const usedOwners = Object.fromEntries([...new Set(Object.values(sats).map((v) => v[1]))].sort().map((c) => [c, ownerNames[c] ?? c]));
  writeFileSync(
    join(outDir, "catalog.json"),
    JSON.stringify({
      builtAt: today,
      satcat: satcatPath.match(/\d{4}-\d{2}-\d{2}/)?.[0],
      ucsVersion: "2023-05-01",
      categories: CATEGORIES.map((c) => c.id),
      owners: usedOwners,
      sats,
    }),
  );
  writeFileSync(join(outDir, "ucs.json"), JSON.stringify(ucsOut));

  console.log(`稼働中 ${active.length} 機（${activePath.match(/\d{4}-\d{2}-\d{2}/)?.[0]} の一覧）`);
  console.log(`種類の決め方：CelesTrak の分類 ${how.group}、UCS ${how.ucs}、名前 ${how.name}`);
  console.log(`UCS に載っている衛星：${Object.keys(ucsOut).length} 機（${((Object.keys(ucsOut).length / active.length) * 100).toFixed(1)}%）`);
  for (const c of CATEGORIES) console.log(`  ${c.label}: ${counts.get(c.id) ?? 0}`);
}

main();
