// API（サーバー）だけが読むデータ。vercel.json の includeFiles で関数と一緒に置かれる
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Catalog, UcsRecord } from "./facts.js";
import { UCS_JSON } from "./ucs.js";

let catalog: Catalog | undefined;
let ucs: Record<string, UcsRecord> | null | undefined;

export function loadCatalog(): Catalog {
  catalog ??= JSON.parse(readFileSync(join(process.cwd(), "public", "data", "catalog.json"), "utf8"));
  return catalog!;
}

/** UCS の項目。ビルドで作れなかったときは null（「載っていない」と取り違えないよう、呼び出し側でエラーにする） */
export function loadUcs(): Record<string, UcsRecord> | null {
  if (ucs === undefined) {
    const path = join(process.cwd(), UCS_JSON);
    ucs = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
    if (!ucs) console.error(`${UCS_JSON} がありません（pnpm ucs で作る）`);
  }
  return ucs ?? null;
}
