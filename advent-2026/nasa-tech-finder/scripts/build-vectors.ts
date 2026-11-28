// 特許をベクトルにして vectors/patents.json に保存する（pnpm vectors。手元で動かし、結果を Git に入れる）
// まだベクトルがない特許だけを送るので、2回目からは新しく増えた特許の分だけで済む
import { patentText } from "../lib/patents.js";
import { readVectors, VECTORS_FILE, writeVectors } from "../lib/vectors-file.js";
import { DIM, embed, estimateTokens, toB64, VOYAGE_MODEL } from "../lib/voyage.js";
import { loadPatents } from "./patents-cache.js";

const { patents } = await loadPatents();
const prev = readVectors();
const same = prev && prev.model === VOYAGE_MODEL() && prev.dim === DIM;
const vectors = same ? { ...prev.vectors } : {};
const todo = patents.filter((p) => !vectors[p.id]);
const tokens = todo.reduce((s, p) => s + estimateTokens(patentText(p)), 0);
console.log(`${patents.length}件のうち、ベクトルがないもの ${todo.length}件（見積もり 約${Math.round(tokens / 1000)}千トークン、無料の制限で約${Math.ceil(tokens / 8000)}分）`);
if (todo.length) {
  const vecs = await embed(todo.map(patentText), "document", { log: console.log, retries: 10 });
  todo.forEach((p, i) => (vectors[p.id] = toB64(vecs[i])));
}
writeVectors({ model: VOYAGE_MODEL(), dim: DIM, updatedAt: new Date().toISOString(), vectors });
console.log(`${VECTORS_FILE} に保存（${Object.keys(vectors).length}件）`);
