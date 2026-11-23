// 全体の流れ：依存の一覧 → 4つのデータ → 優先度 → （キーがあれば）AI の説明と乗り換え先
import { explainPriorities, suggestAlternatives, type AlternativesResult, type ExplainResult } from "./ai.js";
import { checkHealth } from "./health.js";
import { rankFindings } from "./score.js";
import { loadEpss } from "./sources/epss.js";
import { loadKev } from "./sources/kev.js";
import { findVulnerabilities } from "./sources/osv.js";
import type { Dependency, Finding, PackageHealth } from "./types.js";

export interface AnalyzeOptions {
  /** 説明する上位の件数 */
  top: number;
  ai: boolean;
  now?: Date;
  log?: (msg: string) => void;
}

export interface Analysis {
  generatedAt: string;
  deps: Dependency[];
  skipped: string[];
  findings: Finding[];
  health: PackageHealth[];
  kevVersion: string;
  epssDate: string | null;
  explain: ExplainResult | null;
  alternatives: AlternativesResult | null;
  /** AI を使わなかった理由（キーがない、--no-ai など） */
  aiSkippedReason: string | null;
  aiErrors: string[];
}

export async function analyze(deps: Dependency[], skipped: string[], opts: AnalyzeOptions): Promise<Analysis> {
  const log = opts.log ?? (() => {});
  const now = opts.now ?? new Date();

  log(`依存 ${deps.length} 個の脆弱性を OSV で調べています…`);
  const [vulnsByDep, kev] = await Promise.all([findVulnerabilities(deps), loadKev()]);
  const items = [...vulnsByDep].flatMap(([dep, vulns]) => vulns.map((vuln) => ({ dep, vuln })));

  log(`脆弱性 ${items.length} 件の悪用確率を EPSS で調べています…`);
  const epss = await loadEpss(items.flatMap((i) => i.vuln.cves));

  const findings = rankFindings(
    items.map(({ dep, vuln }) => {
      const k = vuln.cves.map((c) => kev.byCve.get(c)).find(Boolean);
      const e = vuln.cves.map((c) => epss.get(c)).filter(Boolean).sort((a, b) => b!.probability - a!.probability)[0];
      return {
        dep,
        vuln,
        kev: k ? { dateAdded: k.dateAdded, ransomware: k.knownRansomwareCampaignUse === "Known" } : null,
        epss: e ?? null,
      };
    }),
  );

  log(`直接の依存 ${deps.filter((d) => d.direct).length} 個の更新状況を deps.dev で調べています…`);
  const health = await checkHealth(deps, now);

  let explain: ExplainResult | null = null;
  let alternatives: AlternativesResult | null = null;
  let aiSkippedReason: string | null = null;
  const aiErrors: string[] = [];
  if (!opts.ai) aiSkippedReason = "--no-ai が指定されたため";
  else if (!process.env.ANTHROPIC_API_KEY) aiSkippedReason = "ANTHROPIC_API_KEY が設定されていないため";
  else {
    const top = findings.slice(0, opts.top);
    if (top.length) {
      log("AI が順番の理由を説明しています…");
      try {
        explain = await explainPriorities(top, {
          vulns: findings.length,
          urgent: findings.filter((f) => f.priority.urgent).length,
          deps: deps.length,
        });
      } catch (err) {
        aiErrors.push(`順番の説明に失敗：${(err as Error).message}`);
      }
    }
    // 料金を抑えるため、乗り換え先を調べるのは最大8個まで
    const problems = health.filter((h) => h.needsAlternative).slice(0, 8);
    if (problems.length) {
      log(`AI が乗り換え先を調べています（${problems.length} 個）…`);
      try {
        alternatives = await suggestAlternatives(problems, now);
      } catch (err) {
        aiErrors.push(`乗り換え先の提案に失敗：${(err as Error).message}`);
      }
    }
  }

  return {
    generatedAt: now.toISOString(),
    deps,
    skipped,
    findings,
    health,
    kevVersion: kev.version,
    epssDate: [...epss.values()][0]?.date ?? null,
    explain,
    alternatives,
    aiSkippedReason,
    aiErrors,
  };
}
