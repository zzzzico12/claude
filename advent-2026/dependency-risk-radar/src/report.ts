// Markdown のレポートを作る（GitHub の Job Summary やプルリクエストのコメントにそのまま貼れる形）
import { toMarkdown } from "@advent/attribution";
import type { Analysis } from "./analyze.js";
import { fmtProb, fmtTop } from "./score.js";
import { sources } from "./sources.js";
import type { Finding } from "./types.js";
import { compareVersions } from "./version.js";

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");


function vulnLink(f: Finding) {
  const label = f.vuln.cves[0] ?? f.vuln.id;
  return `[${label}](${f.vuln.url})`;
}

function kind(f: Finding) {
  return [f.dep.direct ? "直接" : "間接", f.dep.dev ? "開発用" : ""].filter(Boolean).join("・");
}

function evidence(f: Finding) {
  const parts: string[] = [];
  if (f.kev) parts.push(`🔴 **悪用確認済み**（KEV ${f.kev.dateAdded}）`);
  if (f.epss) parts.push(`悪用確率 ${fmtProb(f.epss.probability)}（上位${fmtTop(f.epss.percentile)}）`);
  parts.push(`${f.vuln.severity}${f.vuln.cvssScore !== null ? ` ${f.vuln.cvssScore}` : ""}`);
  return parts.join("<br>");
}

function action(f: Finding) {
  return f.vuln.fixedVersion ? `${f.vuln.fixedVersion} に上げる` : "修正版なし（回避策を確認）";
}

function table(rows: Finding[]) {
  return [
    "| 順位 | パッケージ | 脆弱性 | 根拠 | 依存 | 対応 |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (f) =>
        `| ${f.priority.rank}${f.priority.urgent ? " ⚠️" : ""} | ${esc(f.dep.name)}@${esc(f.dep.version)} | ${vulnLink(f)}<br>${esc(f.vuln.summary)} | ${evidence(f)} | ${kind(f)} | ${action(f)} |`,
    ),
  ].join("\n");
}

export interface UpgradePlan {
  name: string;
  version: string;
  total: number;
  urgent: number;
  kev: number;
  /** これ以上に上げれば、修正版のある脆弱性がすべて直る */
  target: string | null;
  unfixed: number;
}

/** パッケージごとに「どこまで上げれば何件直るか」をまとめる（脆弱性が多い順ではなく、急ぐものが多い順） */
export function upgradePlans(findings: Finding[]): UpgradePlan[] {
  const byPkg = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = `${f.dep.ecosystem}:${f.dep.name}@${f.dep.version}`;
    byPkg.set(key, [...(byPkg.get(key) ?? []), f]);
  }
  return [...byPkg.values()]
    .map((fs) => {
      const fixes = fs.map((f) => f.vuln.fixedVersion).filter((v): v is string => v !== null).sort(compareVersions);
      return {
        name: fs[0].dep.name,
        version: fs[0].dep.version,
        total: fs.length,
        urgent: fs.filter((f) => f.priority.urgent).length,
        kev: fs.filter((f) => f.kev).length,
        target: fixes.at(-1) ?? null,
        unfixed: fs.length - fixes.length,
      };
    })
    .sort((a, b) => b.kev - a.kev || b.urgent - a.urgent || b.total - a.total);
}

export function renderReport(a: Analysis, { top, fileName }: { top: number; fileName: string }): string {
  const urgent = a.findings.filter((f) => f.priority.urgent);
  const kevCount = a.findings.filter((f) => f.kev).length;
  const withFix = a.findings.filter((f) => f.vuln.fixedVersion).length;
  const directCount = a.deps.filter((d) => d.direct).length;
  const out: string[] = [];

  out.push(`# 依存ライブラリのリスクレポート`);
  out.push(
    `\`${fileName}\` ・ 依存 ${a.deps.length} 個（直接 ${directCount} 個） ・ 脆弱性 ${a.findings.length} 件 ・ ` +
      `**今日対応すべき ${urgent.length} 件**（悪用確認済み ${kevCount} 件） ・ 修正版あり ${withFix} 件`,
  );
  out.push(`> ⚠️ は「今日対応すべき」（CISA KEV に載っている、または EPSS が全CVEの上位5%）。順位はコードで計算し、AI は説明だけをしています。`);

  out.push(`\n## 今日対応すべき順（上位 ${Math.min(top, a.findings.length)} 件）`);
  if (a.findings.length === 0) out.push("見つかった脆弱性はありません。");
  else {
    out.push(table(a.findings.slice(0, top)));
    if (a.explain) {
      out.push(`\n### なぜこの順番か（AI による説明）\n\n${a.explain.overview}\n`);
      for (const f of a.findings.slice(0, top)) {
        const r = a.explain.reasons.get(f.vuln.id);
        if (r) out.push(`${f.priority.rank}. **${esc(f.dep.name)}**（${f.vuln.cves[0] ?? f.vuln.id}）：${r}`);
      }
    }
    const rest = a.findings.slice(top);
    if (rest.length) {
      out.push(`\n<details><summary>残りの脆弱性 ${rest.length} 件</summary>\n\n${table(rest)}\n\n</details>`);
    }
  }

  const plans = upgradePlans(a.findings);
  if (plans.length) {
    out.push(`\n## パッケージごとの対応（${plans.length} 個）`);
    out.push("脆弱性の数は多くても、作業は「パッケージを上げる」だけのことが多い。急ぐものが多い順。");
    out.push("| パッケージ | 脆弱性 | うち今日対応すべき | すべて直すには | 修正版なし |", "| --- | --- | --- | --- | --- |");
    for (const p of plans) {
      out.push(
        `| ${esc(p.name)}@${esc(p.version)} | ${p.total} 件 | ${p.urgent ? `**${p.urgent} 件**${p.kev ? `（悪用確認済み ${p.kev}）` : ""}` : "0 件"} | ${p.target ? `${p.target} 以上` : "—"} | ${p.unfixed || "—"} |`,
      );
    }
  }

  const problems = a.health.filter((h) => h.problems.length);
  out.push(`\n## 放置・非推奨の直接の依存（${problems.length} 個）`);
  out.push("「このバージョンは非推奨」は上げれば済む。「パッケージ自体が非推奨」と「長く更新がない」ものは、AI に乗り換え先を調べさせる。");
  if (problems.length === 0) out.push("ありません。");
  else {
    const alt = new Map((a.alternatives?.items ?? []).map((i) => [i.package, i]));
    out.push("| パッケージ | 状態 | 乗り換え先の提案（AI） |", "| --- | --- | --- |");
    for (const h of problems) {
      const item = alt.get(h.dep.name);
      let suggestion = !h.needsAlternative ? "バージョンを上げる" : a.alternatives ? "（提案なし）" : "—";
      if (item && h.needsAlternative) {
        const lines = [
          ...(item.builtin ? [`🔧 標準機能：${esc(item.builtin)}`] : []),
          ...item.alternatives.map((x) =>
            x.verifyProblems.length
              ? `❓ ${esc(x.name)}（確認できず：${esc(x.verifyProblems.join("、"))}）`
              : `✅ **${esc(x.name)}**（${x.latestVersion}、${x.latestPublished?.slice(0, 10)} 公開）：${esc(x.why)}`,
          ),
          ...(item.keepReason && item.alternatives.length === 0 && !item.builtin ? [`乗り換え不要：${esc(item.keepReason)}`] : []),
        ];
        if (lines.length) suggestion = lines.join("<br>");
      }
      out.push(`| ${esc(h.dep.name)}@${esc(h.dep.version)} | ${esc(h.problems.join("<br>"))} | ${suggestion} |`);
    }
    if (a.alternatives) {
      out.push(`\n✅ は、AI が提案したパッケージをコードで deps.dev に問い合わせ、実在・非推奨でない・2年以内に更新あり を確かめたもの。AI は道具を ${a.alternatives.lookups} 回使って調べました。`);
    }
  }

  out.push(`\n## 自動チェック`);
  if (a.aiSkippedReason) out.push(`- AI の説明と提案は使っていません（${a.aiSkippedReason}）`);
  if (a.explain) {
    out.push(
      a.explain.unmatchedNumbers.length
        ? `- ⚠️ AI の説明に、根拠のデータにない数字があります：${a.explain.unmatchedNumbers.join("、")}`
        : "- ✅ AI の説明の数字は、すべて根拠のデータと一致",
    );
  }
  for (const e of a.aiErrors) out.push(`- ⚠️ ${e}`);
  if (a.skipped.length) out.push(`- 読めなかった行・パッケージ ${a.skipped.length} 件（バージョンが固定されていないなど）：${a.skipped.slice(0, 5).map((s) => `\`${esc(s)}\``).join(", ")}${a.skipped.length > 5 ? " ほか" : ""}`);
  out.push(`- データ：CISA KEV ${a.kevVersion} 版、EPSS ${a.epssDate ?? "—"}、作成 ${a.generatedAt.slice(0, 16).replace("T", " ")} UTC`);

  out.push(`\n## 出典\n\n${toMarkdown(sources)}`);
  return out.join("\n");
}
