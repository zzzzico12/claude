// バージョンの比較（npm の semver と Python の PEP 440 のよくある形に対応する簡易版）。
// 1.2.10 > 1.2.9、1.0.0 > 1.0.0-beta.1、1.0 > 1.0rc1 を正しく判定できれば、修正版の選択には十分。

function parts(v: string): { nums: number[]; pre: string | null } {
  const clean = v.trim().replace(/^v/, "").split("+")[0];
  const m = clean.match(/^(\d+(?:\.\d+)*)(.*)$/);
  if (!m) return { nums: [], pre: clean };
  const pre = m[2].replace(/^[-.]/, "");
  // 1.0.post1 は 1.0 より新しい（プレリリースではない）
  return { nums: m[1].split(".").map(Number), pre: pre && !/^post/i.test(pre) ? pre : null };
}

export function compareVersions(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  const len = Math.max(pa.nums.length, pb.nums.length);
  for (let i = 0; i < len; i++) {
    const d = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0);
    if (d !== 0) return Math.sign(d);
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null) return 1; // 正式版はプレリリースより新しい
  if (pb.pre === null) return -1;
  return pa.pre.localeCompare(pb.pre, "en", { numeric: true });
}

type OsvEvent = { introduced?: string; fixed?: string; last_affected?: string };

/**
 * OSV の影響範囲（introduced / fixed の組）から、今のバージョンに当てはまる修正版を探す。
 * 当てはまる範囲に fixed がない（まだ直っていない）場合は null。
 */
export function findFixedVersion(current: string, ranges: { type: string; events: OsvEvent[] }[]): string | null {
  for (const range of ranges) {
    if (range.type === "GIT") continue;
    let introduced: string | null = null;
    for (const e of range.events) {
      if (e.introduced !== undefined) introduced = e.introduced;
      if (e.fixed !== undefined && introduced !== null) {
        const inRange =
          (introduced === "0" || compareVersions(current, introduced) >= 0) && compareVersions(current, e.fixed) < 0;
        if (inRange) return e.fixed;
        introduced = null;
      }
    }
  }
  return null;
}
