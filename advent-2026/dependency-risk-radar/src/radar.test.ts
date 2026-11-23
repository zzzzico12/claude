import { describe, expect, it } from "vitest";
import { cvss3BaseScore, severityFromScore } from "./cvss.js";
import { assess } from "./health.js";
import { parsePackageLock, parseRequirements } from "./parse.js";
import { upgradePlans } from "./report.js";
import { fmtProb, fmtTop, rankFindings } from "./score.js";
import type { PackageInfo } from "./sources/depsdev.js";
import { mergeDuplicates } from "./sources/osv.js";
import type { Dependency, Vulnerability } from "./types.js";
import { compareVersions, findFixedVersion } from "./version.js";

describe("依存ファイルの読み取り", () => {
  it("package-lock.json（v3）：直接・間接・開発用を見分ける", () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { dependencies: { express: "^4" }, devDependencies: { mocha: "^6" } },
        "node_modules/express": { version: "4.16.0" },
        "node_modules/qs": { version: "6.5.1" },
        "node_modules/mocha": { version: "6.2.0", dev: true },
        "node_modules/mocha/node_modules/@scope/x": { version: "1.0.0", dev: true },
        "node_modules/local": { link: true },
      },
    });
    const { deps } = parsePackageLock(lock);
    const by = Object.fromEntries(deps.map((d) => [d.name, d]));
    expect(by.express).toMatchObject({ direct: true, dev: false });
    expect(by.qs).toMatchObject({ direct: false, dev: false });
    expect(by.mocha).toMatchObject({ direct: true, dev: true });
    expect(by["@scope/x"]).toMatchObject({ direct: false, dev: true, version: "1.0.0" });
    expect(by.local).toBeUndefined();
  });
  it("古い lockfileVersion 1 はエラーで作り直しを促す", () => {
    expect(() => parsePackageLock(JSON.stringify({ lockfileVersion: 1, dependencies: {} }))).toThrow(/npm 7/);
  });
  it("requirements.txt：== で固定された行だけ読み、名前を正規化する", () => {
    const { deps, skipped } = parseRequirements("Django==3.2.0\nJinja2[i18n]==2.10 ; python_version<'3.12'\nrequests>=2\n# comment\n-r other.txt\n");
    expect(deps.map((d) => `${d.name}@${d.version}`)).toEqual(["django@3.2.0", "jinja2@2.10"]);
    expect(skipped).toEqual(["requests>=2"]);
  });
});

describe("バージョン", () => {
  it("数字として比べ、正式版はプレリリースより新しい", () => {
    expect(compareVersions("1.2.10", "1.2.9")).toBe(1);
    expect(compareVersions("1.0.0", "1.0.0-beta.1")).toBe(1);
    expect(compareVersions("1.0", "1.0rc1")).toBe(1);
    expect(compareVersions("2.0", "2.0.0")).toBe(0);
  });
  it("今のバージョンが入る範囲の修正版を選ぶ", () => {
    const ranges = [
      { type: "ECOSYSTEM", events: [{ introduced: "0" }, { fixed: "3.2.14" }, { introduced: "4.0" }, { fixed: "4.0.6" }] },
    ];
    expect(findFixedVersion("3.2.0", ranges)).toBe("3.2.14");
    expect(findFixedVersion("4.0.1", ranges)).toBe("4.0.6");
    expect(findFixedVersion("3.2.14", ranges)).toBeNull();
  });
});

describe("CVSS v3", () => {
  it("仕様どおりに基本スコアを計算する", () => {
    expect(cvss3BaseScore("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toBe(9.8);
    expect(cvss3BaseScore("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H")).toBe(10);
    expect(cvss3BaseScore("CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H")).toBe(8.8);
    expect(cvss3BaseScore("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H")).toBe(7.5);
    expect(cvss3BaseScore("CVSS:4.0/AV:N")).toBeNull();
    expect(severityFromScore(7.5)).toBe("HIGH");
  });
});

const dep = (over: Partial<Dependency> = {}): Dependency => ({
  ecosystem: "npm",
  name: "a",
  version: "1.0.0",
  direct: true,
  dev: false,
  ...over,
});
const vuln = (over: Partial<Vulnerability> = {}): Vulnerability => ({
  id: "GHSA-x",
  cves: ["CVE-1"],
  summary: "",
  published: "2024-01-01",
  severity: "HIGH",
  cvssScore: 7.5,
  fixedVersion: "1.0.1",
  url: "",
  ...over,
});

describe("重複のまとめ", () => {
  it("同じ CVE の GHSA と PYSEC を1件にし、深刻度は分かっているほう、修正版は低いほうを使う", () => {
    const merged = mergeDuplicates([
      vuln({ id: "PYSEC-1", severity: "UNKNOWN", cvssScore: null, fixedVersion: "3.2.14", summary: "long text" }),
      vuln({ id: "GHSA-1", severity: "CRITICAL", cvssScore: 9.8, fixedVersion: "3.2.15", summary: "short" }),
      vuln({ id: "GHSA-2", cves: ["CVE-2"] }),
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ id: "GHSA-1", severity: "CRITICAL", fixedVersion: "3.2.14", summary: "short" });
  });
});

describe("優先度", () => {
  it("KEV は EPSS より上。開発用の依存は下がる", () => {
    const ranked = rankFindings([
      { dep: dep({ name: "high-epss" }), vuln: vuln(), kev: null, epss: { probability: 0.9, percentile: 0.999, date: "" } },
      { dep: dep({ name: "kev" }), vuln: vuln(), kev: { dateAdded: "2024-01-01", ransomware: false }, epss: { probability: 0.01, percentile: 0.5, date: "" } },
      { dep: dep({ name: "dev", dev: true }), vuln: vuln(), kev: null, epss: { probability: 0.5, percentile: 0.99, date: "" } },
      { dep: dep({ name: "prod" }), vuln: vuln(), kev: null, epss: { probability: 0.3, percentile: 0.98, date: "" } },
    ]);
    expect(ranked.map((f) => f.dep.name)).toEqual(["kev", "high-epss", "prod", "dev"]);
    expect(ranked[0].priority).toMatchObject({ rank: 1, urgent: true });
    expect(ranked[0].priority.reasons[0]).toMatch(/KEV/);
  });
  it("100% や 0.0% と書かない", () => {
    expect(fmtProb(0.99999)).toBe("99.9%以上");
    expect(fmtTop(0.99999)).toBe("0.1%未満");
    expect(fmtTop(0.95)).toBe("5.0%");
  });
});

describe("放置・非推奨の判定", () => {
  const info = (over: Partial<PackageInfo>): PackageInfo => ({
    ecosystem: "npm",
    name: "x",
    exists: true,
    latestVersion: "2.0.0",
    latestPublished: "2026-01-01T00:00:00Z",
    deprecated: false,
    deprecatedReason: null,
    latestDeprecated: false,
    license: null,
    repo: null,
    stars: null,
    maintainedScore: null,
    ...over,
  });
  const now = new Date("2026-11-23");
  it("このバージョンだけ非推奨なら、上げれば済む（乗り換え不要）", () => {
    expect(assess(info({ deprecated: true }), now)).toMatchObject({ needsAlternative: false });
  });
  it("パッケージ自体が非推奨、または2年以上更新がなければ乗り換えを考える", () => {
    expect(assess(info({ deprecated: true, latestDeprecated: true }), now).needsAlternative).toBe(true);
    expect(assess(info({ latestPublished: "2020-02-11T00:00:00Z" }), now).problems[0]).toMatch(/6年以上前/);
  });
});

describe("パッケージごとの対応", () => {
  it("すべて直すのに必要な最小のバージョンと、急ぐ件数をまとめる", () => {
    const ranked = rankFindings([
      { dep: dep(), vuln: vuln({ cves: ["CVE-1"], fixedVersion: "1.0.5" }), kev: null, epss: { probability: 0.5, percentile: 0.99, date: "" } },
      { dep: dep(), vuln: vuln({ cves: ["CVE-2"], fixedVersion: "1.0.10" }), kev: null, epss: null },
      { dep: dep(), vuln: vuln({ cves: ["CVE-3"], fixedVersion: null }), kev: null, epss: null },
    ]);
    expect(upgradePlans(ranked)[0]).toMatchObject({ total: 3, urgent: 1, target: "1.0.10", unfixed: 1 });
  });
});
