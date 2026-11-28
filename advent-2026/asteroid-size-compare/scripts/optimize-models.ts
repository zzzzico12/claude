// 3D モデルを軽くする（pnpm models）。Poly Pizza のモデルには、数MB〜十数MBの重いものがあるため
// - 形をそろえる（重なった頂点をまとめる）→ 細かすぎる形を間引く（見た目が変わらない程度）→ 数値を詰めて保存
// - 1MB 以下のものはそのまま
// - `pnpm models --inspect` で中身（頂点・三角形・テクスチャ）を表示するだけ
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, quantize, simplify, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { readdirSync, statSync } from "node:fs";

const DIR = "public/models";
const LIMIT = 1_000_000;
// 間引き方（--ratio 0.2 --error 0.002 のように変えられる。--only titanic.glb で1つだけ）
const arg = (k: string, d: number) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? Number(process.argv[i + 1]) : d;
};
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const kb = (n: number) => `${Math.round(n / 1024)}KB`;

for (const f of readdirSync(DIR).filter((x) => x.endsWith(".glb") && (!only || x === only))) {
  const path = `${DIR}/${f}`;
  const before = statSync(path).size;
  const doc = await io.read(path);
  const r = doc.getRoot();
  let tris = 0;
  for (const m of r.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION")?.getCount() ?? 0) / 3;
  const tex = r.listTextures().reduce((s, t) => s + (t.getImage()?.byteLength ?? 0), 0);
  console.log(`${f.padEnd(16)} ${kb(before).padStart(8)}  三角形 ${Math.round(tris)}  テクスチャ ${r.listTextures().length}枚 ${kb(tex)}`);
  if (process.argv.includes("--inspect") || before <= LIMIT) continue;
  await MeshoptSimplifier.ready;
  await doc.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: arg("ratio", 0.2), error: arg("error", 0.002) }), prune(), quantize());
  await io.write(path, doc);
  console.log(`  → ${kb(statSync(path).size)}`);
}
