// deps.dev（Google の Open Source Insights）：パッケージのバージョン一覧、公開日、非推奨の印、リポジトリ。
import type { Ecosystem } from "../types.js";
import { fetchJson } from "./http.js";

const API = "https://api.deps.dev/v3";
const SYSTEM: Record<Ecosystem, string> = { npm: "npm", PyPI: "pypi" };

interface PackageResponse {
  versions: { versionKey: { version: string }; publishedAt?: string; isDefault?: boolean; isDeprecated?: boolean }[];
}
interface VersionResponse {
  isDeprecated?: boolean;
  deprecatedReason?: string;
  licenses?: string[];
  relatedProjects?: { projectKey: { id: string }; relationType: string }[];
}
interface ProjectResponse {
  starsCount?: number;
  scorecard?: { date?: string; checks?: { name: string; score: number }[] };
}

export interface PackageInfo {
  ecosystem: Ecosystem;
  name: string;
  exists: boolean;
  latestVersion: string | null;
  latestPublished: string | null;
  /** 指定したバージョン（なければ最新版）が非推奨か。npm では「このバージョンは上げて」の意味のことも多い */
  deprecated: boolean;
  deprecatedReason: string | null;
  /** 最新版も非推奨か（= パッケージ自体が非推奨。乗り換えが必要） */
  latestDeprecated: boolean;
  license: string | null;
  repo: string | null;
  stars: number | null;
  /** OpenSSF Scorecard の「Maintained」（0〜10。過去90日の活動） */
  maintainedScore: number | null;
}

const enc = (s: string) => encodeURIComponent(s);

export async function getPackageInfo(ecosystem: Ecosystem, name: string, version?: string): Promise<PackageInfo> {
  const base = `${API}/systems/${SYSTEM[ecosystem]}/packages/${enc(name)}`;
  const pkg = await fetchJson<PackageResponse>(base);
  const empty: PackageInfo = {
    ecosystem,
    name,
    exists: false,
    latestVersion: null,
    latestPublished: null,
    deprecated: false,
    deprecatedReason: null,
    latestDeprecated: false,
    license: null,
    repo: null,
    stars: null,
    maintainedScore: null,
  };
  if (!pkg || pkg.versions.length === 0) return empty;

  const latest = pkg.versions.find((v) => v.isDefault) ?? pkg.versions[pkg.versions.length - 1];
  const lastPublished = pkg.versions
    .map((v) => v.publishedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1) ?? null;

  const target = version ?? latest.versionKey.version;
  const ver = await fetchJson<VersionResponse>(`${base}/versions/${enc(target)}`);
  const repo = ver?.relatedProjects?.find((p) => p.relationType === "SOURCE_REPO")?.projectKey.id ?? null;
  const project = repo ? await fetchJson<ProjectResponse>(`${API}/projects/${enc(repo)}`) : null;

  return {
    ...empty,
    exists: true,
    latestVersion: latest.versionKey.version,
    latestPublished: lastPublished,
    deprecated: Boolean(ver?.isDeprecated),
    deprecatedReason: ver?.deprecatedReason ?? null,
    latestDeprecated: Boolean(latest.isDeprecated),
    license: ver?.licenses?.join(", ") || null,
    repo,
    stars: project?.starsCount ?? null,
    maintainedScore: project?.scorecard?.checks?.find((c) => c.name === "Maintained")?.score ?? null,
  };
}
