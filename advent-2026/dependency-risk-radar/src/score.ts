// 優先度の計算。AI は使わず、すべてコードで決める。評価（scripts/eval.ts）も同じ関数を使う。
import type { Dependency, Finding, Priority, Severity } from "./types.js";

export const SEVERITY_FACTOR: Record<Severity, number> = {
  CRITICAL: 1,
  HIGH: 0.8,
  MODERATE: 0.5,
  LOW: 0.3,
  UNKNOWN: 0.6,
};

/** EPSS がない（CVE 番号がない）脆弱性の仮の確率。深刻度の順に並ぶよう、ごく小さい値にする */
const NO_EPSS = 0.0005;

export interface ScoreInput {
  kev: boolean;
  epss: number | null;
  severity: Severity;
  /** 依存の文脈。評価ではわからないので省略できる */
  dep?: Pick<Dependency, "direct" | "dev" | "ecosystem">;
}

/**
 * 点数 = KEV なら +10（必ず最上位）＋ EPSS × 深刻度の係数 × 依存の文脈の係数
 * - 深刻度の係数：CRITICAL 1.0 / HIGH 0.8 / MODERATE 0.5 / LOW 0.3
 * - 文脈：開発用の依存は 0.5 倍（本番で動かない）、npm の間接の依存は 0.8 倍（直接は上げにくく、呼ばれない部分のこともある）
 */
export function priorityScore({ kev, epss, severity, dep }: ScoreInput): number {
  let context = 1;
  if (dep?.dev) context *= 0.5;
  if (dep && !dep.direct && dep.ecosystem === "npm") context *= 0.8;
  return (kev ? 10 : 0) + (epss ?? NO_EPSS) * SEVERITY_FACTOR[severity] * context;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
/** 悪用確率：99.95% 以上は「99.9%以上」（100% と書かない） */
export const fmtProb = (p: number) => (p >= 0.9995 ? "99.9%以上" : pct(p));
/** 上位何%：0.05% 未満は「0.1%未満」（0.0% と書かない） */
export const fmtTop = (percentile: number) => (1 - percentile < 0.0005 ? "0.1%未満" : pct(1 - percentile));

export function reasonsFor(f: Omit<Finding, "priority">): string[] {
  const r: string[] = [];
  if (f.kev) r.push(`CISA KEV に掲載（${f.kev.dateAdded}）${f.kev.ransomware ? "・ランサムウェアでの悪用あり" : ""}`);
  if (f.epss) r.push(`EPSS ${fmtProb(f.epss.probability)}（全CVEの上位${fmtTop(f.epss.percentile)}）`);
  else r.push("EPSS なし（CVE 番号がない）");
  r.push(`深刻度 ${f.vuln.severity}${f.vuln.cvssScore !== null ? `（CVSS ${f.vuln.cvssScore}）` : ""}`);
  r.push(f.vuln.fixedVersion ? `修正版 ${f.vuln.fixedVersion} あり` : "修正版なし");
  if (f.dep.dev) r.push("開発用の依存");
  if (!f.dep.direct) r.push("間接の依存");
  return r;
}

/** 今日対応すべきか：KEV に載っている、または EPSS が全CVEの上位5%に入る */
export const isUrgent = (f: Omit<Finding, "priority">) => Boolean(f.kev) || (f.epss?.percentile ?? 0) >= 0.95;

export function rankFindings(items: Omit<Finding, "priority">[]): Finding[] {
  const scored = items.map((f) => ({
    ...f,
    score: priorityScore({ kev: Boolean(f.kev), epss: f.epss?.probability ?? null, severity: f.vuln.severity, dep: f.dep }),
  }));
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(Boolean(b.vuln.fixedVersion)) - Number(Boolean(a.vuln.fixedVersion)) ||
      (b.vuln.cvssScore ?? 0) - (a.vuln.cvssScore ?? 0),
  );
  return scored.map(({ score, ...f }, i): Finding => {
    const priority: Priority = {
      rank: i + 1,
      score: Math.round(score * 10000) / 10000,
      urgent: isUrgent(f),
      reasons: reasonsFor(f),
    };
    return { ...f, priority };
  });
}
