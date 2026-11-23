export type Ecosystem = "npm" | "PyPI";

export interface Dependency {
  ecosystem: Ecosystem;
  name: string;
  version: string;
  /** package.json / requirements.txt に直接書かれている依存か */
  direct: boolean;
  /** 開発用の依存（devDependencies）か */
  dev: boolean;
}

export type Severity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";

export interface Vulnerability {
  /** OSV の ID（GHSA-... / PYSEC-...） */
  id: string;
  cves: string[];
  summary: string;
  published: string;
  severity: Severity;
  cvssScore: number | null;
  /** 今のバージョンから上げればよい修正版（なければ null） */
  fixedVersion: string | null;
  url: string;
}

export interface Finding {
  dep: Dependency;
  vuln: Vulnerability;
  kev: { dateAdded: string; ransomware: boolean } | null;
  epss: { probability: number; percentile: number; date: string } | null;
  priority: Priority;
}

export interface Priority {
  /** 最終的な順位（1始まり） */
  rank: number;
  score: number;
  /** 今日対応すべきか（KEV に載っている、または EPSS が上位5%） */
  urgent: boolean;
  /** 根拠（画面と AI の説明の両方に使う） */
  reasons: string[];
}

export interface PackageHealth {
  dep: Dependency;
  exists: boolean;
  latestVersion: string | null;
  latestPublished: string | null;
  deprecated: boolean;
  deprecatedReason: string | null;
  repo: string | null;
  /** 放置・非推奨と判断した理由（問題がなければ空） */
  problems: string[];
  /** 乗り換えを考えるべきか（パッケージ自体が非推奨、または放置）。バージョンを上げれば済む場合は false */
  needsAlternative: boolean;
}
