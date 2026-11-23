// 依存ファイルを読んで、依存の一覧にする。
// - package-lock.json（lockfileVersion 2 / 3。npm 7 以降）
// - requirements.txt（`名前==バージョン` と固定されている行だけ。範囲指定の行は数えて報告する）
import type { Dependency } from "./types.js";

export interface ParseResult {
  deps: Dependency[];
  /** 読めなかった行やパッケージ（レポートの注意書きに出す） */
  skipped: string[];
}

interface LockPackage {
  version?: string;
  dev?: boolean;
  devOptional?: boolean;
  link?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export function parsePackageLock(text: string): ParseResult {
  const lock = JSON.parse(text) as { lockfileVersion?: number; packages?: Record<string, LockPackage> };
  if (!lock.packages) {
    throw new Error("package-lock.json の lockfileVersion 2 以上に対応しています（npm 7 以降で作り直してください）");
  }
  const root = lock.packages[""] ?? {};
  const directNames = new Set([
    ...Object.keys(root.dependencies ?? {}),
    ...Object.keys(root.devDependencies ?? {}),
    ...Object.keys(root.optionalDependencies ?? {}),
  ]);
  const seen = new Set<string>();
  const deps: Dependency[] = [];
  const skipped: string[] = [];
  for (const [path, pkg] of Object.entries(lock.packages)) {
    if (path === "" || pkg.link) continue;
    // "node_modules/a/node_modules/@scope/b" → "@scope/b"
    const name = path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
    if (!pkg.version) {
      skipped.push(name);
      continue;
    }
    const key = `${name}@${pkg.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deps.push({
      ecosystem: "npm",
      name,
      version: pkg.version,
      // 直下の node_modules にあり、package.json に書かれているものが直接の依存
      direct: path === `node_modules/${name}` && directNames.has(name),
      dev: Boolean(pkg.dev || pkg.devOptional),
    });
  }
  return { deps, skipped };
}

/** PEP 503 の正規化（大文字小文字、_ . - の違いをなくす） */
export const normalizePyName = (name: string) => name.toLowerCase().replace(/[-_.]+/g, "-");

export function parseRequirements(text: string): ParseResult {
  const deps: Dependency[] = [];
  const skipped: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) continue;
    // name[extra]==1.2.3 ; python_version<"3.12"
    const m = line.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*===?\s*([A-Za-z0-9.+!_-]+)\s*(?:;.*)?$/);
    if (!m) {
      skipped.push(line);
      continue;
    }
    deps.push({ ecosystem: "PyPI", name: normalizePyName(m[1]), version: m[2], direct: true, dev: false });
  }
  return { deps, skipped };
}

export function parseDependencyFile(fileName: string, text: string): ParseResult {
  if (fileName.endsWith("package-lock.json")) return parsePackageLock(text);
  if (/requirements.*\.txt$/.test(fileName)) return parseRequirements(text);
  throw new Error(`対応していないファイルです: ${fileName}（package-lock.json か requirements.txt を渡してください）`);
}
