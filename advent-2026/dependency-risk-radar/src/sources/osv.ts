// OSV（https://osv.dev/）：オープンソースの脆弱性データベース。
import { cvss3BaseScore, severityFromScore } from "../cvss.js";
import type { Dependency, Severity, Vulnerability } from "../types.js";
import { compareVersions, findFixedVersion } from "../version.js";
import { fetchJson, mapLimit } from "./http.js";

const API = "https://api.osv.dev/v1";

export interface OsvRecord {
  id: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  published: string;
  modified?: string;
  withdrawn?: string;
  severity?: { type: string; score: string }[];
  database_specific?: { severity?: string };
  affected?: {
    package: { name: string; ecosystem: string };
    ranges?: { type: string; events: { introduced?: string; fixed?: string; last_affected?: string }[] }[];
  }[];
}

const SEVERITY_LABELS: Record<string, Severity> = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MODERATE: "MODERATE",
  MEDIUM: "MODERATE",
  LOW: "LOW",
};

/** 深刻度：CVSS v3 のベクトルがあれば計算し、なければ GitHub のラベルを使う */
export function severityOf(r: OsvRecord): { severity: Severity; cvssScore: number | null } {
  for (const s of r.severity ?? []) {
    const score = s.type === "CVSS_V3" ? cvss3BaseScore(s.score) : null;
    if (score !== null) return { severity: severityFromScore(score), cvssScore: score };
  }
  const label = r.database_specific?.severity?.toUpperCase();
  return { severity: (label && SEVERITY_LABELS[label]) || "UNKNOWN", cvssScore: null };
}

export const cvesOf = (r: OsvRecord) => [r.id, ...(r.aliases ?? [])].filter((a) => a.startsWith("CVE-"));

export function toVulnerability(r: OsvRecord, dep: Dependency): Vulnerability {
  const affected = (r.affected ?? []).filter(
    (a) => a.package.ecosystem === dep.ecosystem && a.package.name.toLowerCase() === dep.name.toLowerCase(),
  );
  const fixed = affected.map((a) => findFixedVersion(dep.version, a.ranges ?? [])).find((v) => v !== null) ?? null;
  return {
    id: r.id,
    cves: cvesOf(r),
    summary: (r.summary ?? r.details ?? "").split("\n")[0].slice(0, 120),
    published: r.published,
    ...severityOf(r),
    fixedVersion: fixed,
    url: `https://osv.dev/vulnerability/${r.id}`,
  };
}

/** 依存ごとに、当てはまる脆弱性の一覧を返す（querybatch は1回1,000件まで） */
export async function findVulnerabilities(deps: Dependency[]): Promise<Map<Dependency, Vulnerability[]>> {
  const idsByDep = new Map<Dependency, string[]>();
  for (let i = 0; i < deps.length; i += 1000) {
    const chunk = deps.slice(i, i + 1000);
    const res = await fetchJson<{ results: { vulns?: { id: string }[] }[] }>(`${API}/querybatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: chunk.map((d) => ({ package: { name: d.name, ecosystem: d.ecosystem }, version: d.version })),
      }),
    });
    chunk.forEach((d, j) => idsByDep.set(d, (res?.results[j]?.vulns ?? []).map((v) => v.id)));
  }

  const uniqueIds = [...new Set([...idsByDep.values()].flat())];
  const records = new Map<string, OsvRecord>();
  await mapLimit(uniqueIds, 8, async (id) => {
    const r = await fetchJson<OsvRecord>(`${API}/vulns/${id}`);
    if (r && !r.withdrawn) records.set(id, r);
  });

  const out = new Map<Dependency, Vulnerability[]>();
  for (const [dep, ids] of idsByDep) {
    const vulns = ids.flatMap((id) => (records.has(id) ? [toVulnerability(records.get(id)!, dep)] : []));
    if (vulns.length) out.set(dep, mergeDuplicates(vulns));
  }
  return out;
}

const SEVERITY_ORDER = ["UNKNOWN", "LOW", "MODERATE", "HIGH", "CRITICAL"];

/**
 * 同じ脆弱性が別のデータベースから2件来ることがある（PyPI では GitHub の GHSA と PyPA の PYSEC）。
 * CVE 番号（なければ ID）が同じものを1件にまとめる。
 * - 深刻度は分かっているほう（高いほう）、修正版は低いほう（早く出たほう）を使う
 * - 説明文は GHSA の短い要約を優先する
 */
export function mergeDuplicates(vulns: Vulnerability[]): Vulnerability[] {
  const groups = new Map<string, Vulnerability[]>();
  for (const v of vulns) {
    const key = v.cves[0] ?? v.id;
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }
  return [...groups.values()].map((group) => {
    const primary = group.find((v) => v.id.startsWith("GHSA-")) ?? group[0];
    const bySeverity = [...group].sort(
      (a, b) => SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity) || (b.cvssScore ?? 0) - (a.cvssScore ?? 0),
    )[0];
    const fixes = group.map((v) => v.fixedVersion).filter((f): f is string => f !== null).sort(compareVersions);
    return {
      ...primary,
      cves: [...new Set(group.flatMap((v) => v.cves))],
      severity: bySeverity.severity,
      cvssScore: bySeverity.cvssScore,
      fixedVersion: fixes[0] ?? null,
    };
  });
}
