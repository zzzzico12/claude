// 放置・非推奨の依存を見つける（直接の依存だけ。間接の依存は自分では入れ替えられないので対象外）。
import { mapLimit } from "./sources/http.js";
import { getPackageInfo, type PackageInfo } from "./sources/depsdev.js";
import type { Dependency, PackageHealth } from "./types.js";

/** 最新版がこれより古ければ「放置」とみなす */
export const STALE_YEARS = 2;

const reason = (r: string | null) => (r ? `：${r.slice(0, 120)}` : "");

/**
 * 問題点と、乗り換えを考えるべきかを返す。
 * - パッケージ自体が非推奨（最新版も非推奨）→ 乗り換え
 * - このバージョンだけが非推奨（npm でよくある「上げてください」の印）→ 上げれば済む
 * - 最新版が2年以上出ていない → 放置の可能性（小さく安定したものもあるので、乗り換えるかは AI に判断させる）
 */
export function assess(info: PackageInfo, now = new Date()): { problems: string[]; needsAlternative: boolean } {
  if (!info.exists) return { problems: ["レジストリに見つからない"], needsAlternative: false };
  const problems: string[] = [];
  let needsAlternative = false;
  if (info.latestDeprecated) {
    problems.push(`パッケージ自体が非推奨${reason(info.deprecatedReason)}`);
    needsAlternative = true;
  } else if (info.deprecated) {
    problems.push(`このバージョンは非推奨（最新版 ${info.latestVersion} に上げればよい）${reason(info.deprecatedReason)}`);
  }
  if (info.latestPublished) {
    const years = (now.getTime() - new Date(info.latestPublished).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years >= STALE_YEARS) {
      problems.push(`最新版（${info.latestVersion}）の公開が ${info.latestPublished.slice(0, 7)}（${Math.floor(years)}年以上前）`);
      needsAlternative = true;
    }
  }
  return { problems, needsAlternative };
}

export const problemsOf = (info: PackageInfo, now = new Date()) => assess(info, now).problems;

export async function checkHealth(deps: Dependency[], now = new Date()): Promise<PackageHealth[]> {
  const direct = deps.filter((d) => d.direct);
  return mapLimit(direct, 6, async (dep) => {
    const info = await getPackageInfo(dep.ecosystem, dep.name, dep.version);
    return {
      dep,
      exists: info.exists,
      latestVersion: info.latestVersion,
      latestPublished: info.latestPublished,
      deprecated: info.deprecated,
      deprecatedReason: info.deprecatedReason,
      repo: info.repo,
      ...assess(info, now),
    };
  });
}
