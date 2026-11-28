// 特許とベクトルをまとめたファイル（server-data/index.json）。デプロイのビルドで作り、Vercel Functions に同梱する
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Patent } from "./patents.js";
import { fromB64 } from "./voyage.js";

export const INDEX_FILE = "server-data/index.json";

export interface IndexFile {
  builtAt: string;
  /** 特許を集めた日時 */
  fetchedAt: string;
  model: string;
  dim: number;
  /** NASA に載っているがベクトルがまだない特許の数（手元で pnpm vectors を動かすと加わる） */
  missingVectors: number;
  patents: (Patent & { vec: string })[];
}

export interface Index {
  builtAt: string;
  fetchedAt: string;
  model: string;
  patents: (Patent & { v: Int8Array })[];
}

/** Vercel Functions では process.cwd() がアプリのフォルダとは限らないので、候補を順に探す（Day06 と同じ） */
function candidates(): string[] {
  const appDir = fileURLToPath(new URL("..", import.meta.url));
  return [join(appDir, INDEX_FILE), join(process.cwd(), INDEX_FILE), join(process.cwd(), "advent-2026/nasa-tech-finder", INDEX_FILE)];
}

let cache: Index | null = null;
export function loadIndex(): Index | null {
  if (cache) return cache;
  const path = candidates().find((p) => existsSync(p));
  if (!path) return null;
  const f = JSON.parse(readFileSync(path, "utf8")) as IndexFile;
  cache = { builtAt: f.builtAt, fetchedAt: f.fetchedAt, model: f.model, patents: f.patents.map(({ vec, ...p }) => ({ ...p, v: fromB64(vec) })) };
  return cache;
}
