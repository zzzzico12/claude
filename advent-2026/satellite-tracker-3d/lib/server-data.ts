// API（サーバー）だけが読むデータ。vercel.json の includeFiles で関数と一緒に置かれる
// Vercel の関数では process.cwd() がアプリのフォルダとは限らない（モノレポでは /var/task のことがある）ので、
// このファイルの場所から数えた場所と、cwd から数えた場所の両方を探す
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Catalog, UcsRecord } from "./facts.js";
import { UCS_JSON } from "./ucs.js";

const APP_DIR_FROM_HERE = fileURLToPath(new URL("..", import.meta.url));

function candidates(rel: string) {
  return [
    join(APP_DIR_FROM_HERE, rel),
    join(process.cwd(), rel),
    join(process.cwd(), "advent-2026", "satellite-tracker-3d", rel),
  ];
}

function find(rel: string): string | null {
  const list = candidates(rel);
  const hit = list.find((p) => existsSync(p));
  if (!hit) console.error(`${rel} が見つかりません。探した場所：${list.join("、")}`);
  return hit ?? null;
}

let catalog: Catalog | undefined;
let ucs: Record<string, UcsRecord> | null | undefined;

export function loadCatalog(): Catalog {
  if (!catalog) {
    const p = find(join("public", "data", "catalog.json"));
    if (!p) throw new Error("catalog.json が見つかりません");
    catalog = JSON.parse(readFileSync(p, "utf8")) as Catalog;
  }
  return catalog;
}

/** UCS の項目。ビルドで作れなかったときは null（「載っていない」と取り違えないよう、呼び出し側でエラーにする） */
export function loadUcs(): Record<string, UcsRecord> | null {
  if (ucs === undefined) {
    const p = find(UCS_JSON);
    ucs = p ? JSON.parse(readFileSync(p, "utf8")) : null;
  }
  return ucs ?? null;
}
