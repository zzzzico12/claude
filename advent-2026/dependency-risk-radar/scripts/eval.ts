// 評価：時点を戻して、その日に知り得た情報だけで順位を付け、その後 KEV に載った脆弱性を上位に置けていたかを見る。
//   pnpm eval:fetch   （データの取得。初回だけ）
//   pnpm eval
// 候補：基準日までに公開された、オープンソースのライブラリの CVE（npm 以外の6エコシステム）。その日すでに KEV に載っていたものは除く
// 正解：基準日の後 HORIZON_DAYS 日以内に KEV に載ったもの
// 比べる並べ方：
//   ① 深刻度だけ（CVSS。Dependabot や npm audit の並べ方に近い）
//   ② EPSS だけ
//   ③ このアプリ（EPSS × 深刻度の係数。src/score.ts の priorityScore をそのまま使う。依存の文脈は評価では分からないので使わない）
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { priorityScore } from "../src/score.js";
import type { Severity } from "../src/types.js";
import type { IndexEntry } from "./fetch-eval-data.js";
import { HORIZON_DAYS, SNAPSHOT_DATES } from "./snapshots.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(appDir, "data");

const index = JSON.parse(readFileSync(join(dataDir, "osv-index.json"), "utf8")) as Record<string, IndexEntry>;
const kev = new Map<string, string>(
  (JSON.parse(readFileSync(join(dataDir, "kev.json"), "utf8")).vulnerabilities as { cveID: string; dateAdded: string }[]).map(
    (v) => [v.cveID, v.dateAdded],
  ),
);
const epssDates = JSON.parse(readFileSync(join(dataDir, "epss", "dates.json"), "utf8")) as Record<string, string>;

function loadEpss(day: string): Map<string, number> {
  const text = gunzipSync(readFileSync(join(dataDir, "epss", `${day}.csv.gz`))).toString("utf8");
  const out = new Map<string, number>();
  for (const line of text.split("\n")) {
    if (!line.startsWith("CVE-")) continue;
    const [cve, epss] = line.split(",");
    out.set(cve, Number(epss));
  }
  return out;
}

const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
const SEV_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1, UNKNOWN: 0 };

/** 点数の高い順の順位（同点は平均の順位にする。同点が多い「深刻度だけ」を有利にも不利にもしないため） */
function ranks(scores: number[]): number[] {
  const order = scores.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0]);
  const out = new Array<number>(scores.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k][1]] = avg;
    i = j + 1;
  }
  return out;
}

type Method = "severity" | "epss" | "app";
const METHODS: { key: Method; label: string }[] = [
  { key: "severity", label: "① 深刻度（CVSS）だけ" },
  { key: "epss", label: "② EPSS だけ" },
  { key: "app", label: "③ このアプリ（EPSS × 深刻度）" },
];

interface Hit {
  date: string;
  cve: string;
  packages: string[];
  kevAdded: string;
  poolSize: number;
  epss: number | null;
  severity: string;
  rank: Record<Method, number>;
}

const hits: Hit[] = [];
const perSnapshot: { date: string; epssDate: string; pool: number; positives: number }[] = [];

for (const date of SNAPSHOT_DATES) {
  const epssDay = epssDates[date];
  const epss = loadEpss(epssDay);
  const end = addDays(date, HORIZON_DAYS);
  const pool = Object.entries(index).filter(([cve, e]) => {
    const added = kev.get(cve);
    return e.published.slice(0, 10) <= date && !(added && added <= date);
  });
  const score: Record<Method, number[]> = { severity: [], epss: [], app: [] };
  for (const [cve, e] of pool) {
    const p = epss.get(cve) ?? null;
    score.severity.push(SEV_RANK[e.severity] * 100 + (e.cvss ?? 0));
    score.epss.push(p ?? 0);
    score.app.push(priorityScore({ kev: false, epss: p, severity: e.severity as Severity }));
  }
  const r = { severity: ranks(score.severity), epss: ranks(score.epss), app: ranks(score.app) };
  let positives = 0;
  pool.forEach(([cve, e], i) => {
    const added = kev.get(cve);
    if (!added || added <= date || added > end) return;
    positives++;
    hits.push({
      date,
      cve,
      packages: e.packages.slice(0, 3),
      kevAdded: added,
      poolSize: pool.length,
      epss: epss.get(cve) ?? null,
      severity: e.severity,
      rank: { severity: r.severity[i], epss: r.epss[i], app: r.app[i] },
    });
  });
  perSnapshot.push({ date, epssDate: epssDay, pool: pool.length, positives });
  process.stderr.write(`${date}: 候補 ${pool.length} 件、正解 ${positives} 件\n`);
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const share = (m: Method, top: number) => hits.filter((h) => h.rank[m] / h.poolSize <= top).length / hits.length;
const within = (m: Method, n: number) => hits.filter((h) => h.rank[m] <= n).length;

const summaryRows = METHODS.map(
  ({ key, label }) =>
    `| ${label} | ${Math.round(median(hits.map((h) => h.rank[key])))} 位 | ${pct(median(hits.map((h) => h.rank[key] / h.poolSize)))} | ` +
    `${within(key, 100)} / ${hits.length} | ${pct(share(key, 0.01))} | ${pct(share(key, 0.05))} |`,
);

const hitRows = hits
  .sort((a, b) => a.date.localeCompare(b.date) || a.rank.app - b.rank.app)
  .map(
    (h) =>
      `| ${h.date} | ${h.cve} | ${h.packages.join(", ")} | ${h.kevAdded} | ${h.epss !== null ? pct(h.epss) : "—"} | ${h.severity} | ` +
      `${Math.round(h.rank.severity)} | ${Math.round(h.rank.epss)} | **${Math.round(h.rank.app)}** | ${h.poolSize} |`,
  );

const md = `# 評価結果：依存ライブラリと脆弱性の優先度判定

- 実行日：${new Date().toISOString().slice(0, 10)}
- 方法：**時点を戻して**、その日に知り得た情報（その日の EPSS、深刻度）だけで順位を付け、その後 ${HORIZON_DAYS} 日以内に CISA KEV に載った脆弱性（＝実際に悪用が確認されたもの）を上位に置けていたかを見る
- 基準日：${SNAPSHOT_DATES[0]} から ${SNAPSHOT_DATES.at(-1)} まで3か月ごと（${SNAPSHOT_DATES.length} 回）
- 候補：OSV に載っているオープンソースのライブラリの CVE（Maven・PyPI・Go・RubyGems・Packagist・NuGet）のうち、基準日までに公開され、その日まだ KEV に載っていなかったもの（1回あたり約 ${Math.round(median(perSnapshot.map((s) => s.pool)))} 件）
- 正解：のべ **${hits.length} 件**
- 再現：\`pnpm eval:fetch && pnpm eval\`（データは \`data/\`、Git管理外）

## 結果

| 並べ方 | 正解の順位（中央値） | 上位何%に入ったか（中央値） | 上位100件に入った数 | 上位1%に入った割合 | 上位5%に入った割合 |
| --- | --- | --- | --- | --- | --- |
${summaryRows.join("\n")}

順位は小さいほどよい。「上位100件」は、警告を上から100件見たときに、その後悪用されたものを何件拾えたか。

## 読み方と限界

- ①の「深刻度だけ」は、Dependabot や \`npm audit\` が警告を並べる順に近い。深刻度が同じ（例：HIGH 7.5）ものが大量にあるので、同点は平均の順位にした
- **EPSS 自体が、KEV などの悪用の情報も学習に使っている**ので、②の「EPSS だけ」が強いのは当然。このアプリの③は EPSS に深刻度の係数を掛けたもので、②との差は小さい
- このアプリの順位には、実際には**依存の文脈**（直接の依存か、開発用か、修正版があるか）も入るが、この評価では分からないので使っていない。文脈の効果はこの評価では測れない
- KEV に載った日は、悪用が始まった日ではない（後からまとめて追加されることもある）
- 深刻度は今の OSV のデータを使っている（基準日の時点で付いていた値とは違う場合がある）
- npm は一括データが大きい（222MB、大半はマルウェアの記録）ので評価から外した

## 基準日ごとの候補と正解

| 基準日 | EPSS の日付 | 候補 | 正解 |
| --- | --- | --- | --- |
${perSnapshot.map((s) => `| ${s.date} | ${s.epssDate} | ${s.pool} | ${s.positives} |`).join("\n")}

## 正解ごとの順位

| 基準日 | CVE | パッケージ | KEV に載った日 | 基準日の EPSS | 深刻度 | ① 深刻度 | ② EPSS | ③ アプリ | 候補数 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${hitRows.join("\n")}
`;

writeFileSync(join(appDir, "eval", "RESULTS.md"), md);
process.stderr.write(`eval/RESULTS.md を書きました（正解 ${hits.length} 件）\n`);
console.log(summaryRows.join("\n"));
