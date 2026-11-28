// 比べる物を Wikidata から取り直して reference/objects.ts に保存する（pnpm objects）
// JSON ではなく TS にするのは、Vercel Functions にそのまま同梱されるようにするため
import { writeFileSync } from "node:fs";
import { fetchObjects } from "../lib/objects.js";

const f = await fetchObjects();
for (const o of f.objects) console.log(`${o.name.ja.padEnd(16)} ${o.prop} ${o.value}`);
if (f.skipped.length) console.log("値が1つに決まらず除いたもの：", f.skipped);
writeFileSync(
  "reference/objects.ts",
  `// pnpm objects で Wikidata から作ったファイル（手で直さない）\nimport type { ObjectsFile } from "../lib/objects.js";\n\nexport const OBJECTS: ObjectsFile = ${JSON.stringify(f, null, 1)};\n`,
);
console.log(`reference/objects.ts に保存（${f.objects.length}件）`);
