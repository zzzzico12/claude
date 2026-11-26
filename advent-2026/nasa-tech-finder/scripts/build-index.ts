// 特許を集めてベクトルにし、server-data/index.json に保存する（pnpm index）
// - 集めた特許は data/patents.json に保存し、7日以内なら NASA に取りに行かず使い回す
// - デプロイのビルドでは data/ がないので、毎回集める（約1分半。NASA への問い合わせは約55回、1.5秒ずつあける）
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { INDEX_FILE, type IndexFile } from "../lib/index-file.js";
import { collectPatents, patentText, type Patent } from "../lib/patents.js";
import { DIM, embed, toB64, VOYAGE_MODEL } from "../lib/voyage.js";

const RAW = "data/patents.json";
const MAX_AGE_DAYS = 7;

let patents: Patent[];
let fetchedAt: string;
if (existsSync(RAW) && (Date.now() - statSync(RAW).mtimeMs) / 86400_000 < MAX_AGE_DAYS) {
  patents = JSON.parse(readFileSync(RAW, "utf8"));
  fetchedAt = statSync(RAW).mtime.toISOString();
  console.log(`${RAW} を使う（${patents.length}件、${fetchedAt}）`);
} else {
  console.log("NASA T2 から特許を集める…");
  patents = await collectPatents(console.log);
  fetchedAt = new Date().toISOString();
  mkdirSync("data", { recursive: true });
  writeFileSync(RAW, JSON.stringify(patents));
}

console.log(`${patents.length}件をベクトルにする（${VOYAGE_MODEL()}、${DIM}次元）…`);
const vecs = await embed(patents.map(patentText), "document");
const out: IndexFile = {
  builtAt: new Date().toISOString(),
  fetchedAt,
  model: VOYAGE_MODEL(),
  dim: DIM,
  patents: patents.map((p, i) => ({ ...p, vec: toB64(vecs[i]) })),
};
mkdirSync("server-data", { recursive: true });
writeFileSync(INDEX_FILE, JSON.stringify(out));
console.log(`${INDEX_FILE} に保存（${(JSON.stringify(out).length / 1024).toFixed(0)}KB）`);
