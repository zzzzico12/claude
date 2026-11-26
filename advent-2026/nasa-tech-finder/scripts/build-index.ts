// 特許の本文とベクトルを結びつけて server-data/index.json に保存する（pnpm index。デプロイのビルドで動かす）
// Voyage は呼ばない。ベクトルは vectors/patents.json（pnpm vectors で手元で作ったもの）を使う
import { mkdirSync, writeFileSync } from "node:fs";
import { INDEX_FILE, type IndexFile } from "../lib/index-file.js";
import { readVectors, VECTORS_FILE } from "../lib/vectors-file.js";
import { loadPatents } from "./patents-cache.js";

const v = readVectors();
if (!v) throw new Error(`${VECTORS_FILE} がありません。手元で pnpm vectors を動かしてください`);
const { patents, fetchedAt } = await loadPatents();
const withVec = patents.filter((p) => v.vectors[p.id]);
const missing = patents.length - withVec.length;
const out: IndexFile = {
  builtAt: new Date().toISOString(),
  fetchedAt,
  model: v.model,
  dim: v.dim,
  missingVectors: missing,
  patents: withVec.map((p) => ({ ...p, vec: v.vectors[p.id] })),
};
mkdirSync("server-data", { recursive: true });
writeFileSync(INDEX_FILE, JSON.stringify(out));
console.log(`${INDEX_FILE} に保存（${withVec.length}件。ベクトルがなく除いた特許 ${missing}件${missing ? "：手元で pnpm vectors を動かすと加わる" : ""}）`);
