// AI を呼ばずに、保存済みの色の割り当て（lib/paintings-data.json）からテーマを作り直す
//   pnpm themes:rebuild    （lib/theme.ts を変えたときに使う。pnpm rebuild は pnpm 自体のコマンドなので名前を変えている）
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PaintingInfo } from "../lib/paintings.js";
import { buildTheme } from "../lib/theme.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(appDir, "lib", "paintings-data.json");
const infos = JSON.parse(readFileSync(file, "utf8")) as PaintingInfo[];
for (const p of infos) {
  const built = buildTheme(p.label, p.roles);
  writeFileSync(join(appDir, "themes", `${p.slug}.json`), JSON.stringify(built.json, null, 2) + "\n");
  p.adjustments = built.adjustments;
}
writeFileSync(file, JSON.stringify(infos, null, 2) + "\n");
process.stderr.write(`テーマ ${infos.length} 個を作り直しました（AI は使っていない）\n`);
