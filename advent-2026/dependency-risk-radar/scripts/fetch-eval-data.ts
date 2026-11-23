// 評価用のデータを data/（Git管理外）に取得する。すでにあるファイルは取り直さない。
//   pnpm eval:fetch
// - OSV の一括データ（npm 以外の6エコシステム。npm は222MBあり大半がマルウェアの記録なので除く）
//   → CVE ごとの索引 data/osv-index.json にまとめる
// - CISA KEV（JSON）
// - EPSS の日ごとの一括 CSV（基準日の分だけ。1日分 約1.3MB）
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cvesOf, severityOf, type OsvRecord } from "../src/sources/osv.js";
import { KEV_URL } from "../src/sources/kev.js";
import { SNAPSHOT_DATES } from "./snapshots.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
export const ECOSYSTEMS = ["Maven", "PyPI", "Go", "RubyGems", "Packagist", "NuGet"];

async function download(url: string, file: string): Promise<boolean> {
  if (existsSync(file)) return true;
  mkdirSync(dirname(file), { recursive: true });
  process.stderr.write(`取得: ${url}\n`);
  const res = await fetch(url);
  if (res.status === 403 || res.status === 404) return false;
  if (!res.ok) throw new Error(`${url} が HTTP ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

export interface IndexEntry {
  published: string;
  severity: string;
  cvss: number | null;
  ecosystems: string[];
  packages: string[];
}

async function main() {
  for (const eco of ECOSYSTEMS) {
    await download(`https://osv-vulnerabilities.storage.googleapis.com/${eco}/all.zip`, join(dataDir, "osv", `${eco}.zip`));
  }
  await download(KEV_URL, join(dataDir, "kev.json"));
  // EPSS の一括 CSV は欠けている日がある（例：2024-12-01）。その場合は翌日以降（最大3日後）を使い、実際の日付を記録する
  const actualDates: Record<string, string> = {};
  for (const d of SNAPSHOT_DATES) {
    for (let k = 0; k <= 3; k++) {
      const day = addDays(d, k);
      if (await download(`https://epss.empiricalsecurity.com/epss_scores-${day}.csv.gz`, join(dataDir, "epss", `${day}.csv.gz`))) {
        actualDates[d] = day;
        break;
      }
    }
    if (!actualDates[d]) throw new Error(`EPSS ${d} 前後の一括データが見つかりません`);
    await new Promise((r) => setTimeout(r, 300)); // 提供元に負荷をかけない
  }
  writeFileSync(join(dataDir, "epss", "dates.json"), JSON.stringify(actualDates, null, 2));

  const indexFile = join(dataDir, "osv-index.json");
  if (existsSync(indexFile)) return;
  // CVE ごとに「いちばん早い公開日」「分かっている深刻度」「どのパッケージか」をまとめる
  const index: Record<string, IndexEntry> = {};
  const order = ["UNKNOWN", "LOW", "MODERATE", "HIGH", "CRITICAL"];
  for (const eco of ECOSYSTEMS) {
    const tmp = join(dataDir, "osv", `_${eco}`);
    rmSync(tmp, { recursive: true, force: true });
    execFileSync("unzip", ["-q", "-o", join(dataDir, "osv", `${eco}.zip`), "-d", tmp]);
    for (const f of readdirSync(tmp)) {
      const r = JSON.parse(readFileSync(join(tmp, f), "utf8")) as OsvRecord;
      if (r.withdrawn || r.id.startsWith("MAL-")) continue;
      const sev = severityOf(r);
      for (const cve of cvesOf(r)) {
        const e = (index[cve] ??= { published: r.published, severity: "UNKNOWN", cvss: null, ecosystems: [], packages: [] });
        if (r.published < e.published) e.published = r.published;
        if (order.indexOf(sev.severity) > order.indexOf(e.severity)) Object.assign(e, { severity: sev.severity, cvss: sev.cvssScore });
        if (!e.ecosystems.includes(eco)) e.ecosystems.push(eco);
        for (const a of r.affected ?? []) if (!e.packages.includes(a.package.name)) e.packages.push(a.package.name);
      }
    }
    rmSync(tmp, { recursive: true, force: true });
  }
  writeFileSync(indexFile, JSON.stringify(index));
  process.stderr.write(`索引: CVE ${Object.keys(index).length} 件 → ${indexFile}\n`);
}

main();
