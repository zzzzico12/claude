// UCS Satellite Database から、サーバーだけが読む server-data/ucs.json を作る
//   pnpm ucs
// Vercel ではビルドのたびに（＝デプロイのときだけ）1回取得する。手元では data/ucs/ に保存したものを使い回す。
// まとめたファイルはリポジトリにも public/ にも入れない（UCS には明示のライセンスがないため。lib/ucs.ts）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseUcs, UCS_FILE, UCS_JSON, UCS_URL } from "../lib/ucs.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "advent-2026-satellite-tracker (https://github.com/zzzzico12/claude)";

async function main() {
  const local = join(appDir, "data", "ucs", UCS_FILE);
  let text: string;
  if (existsSync(local)) {
    text = readFileSync(local, "latin1");
  } else {
    const res = await fetch(UCS_URL, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${UCS_URL} が HTTP ${res.status} を返しました`);
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local, buf);
    text = buf.toString("latin1");
  }
  const ucs = parseUcs(text);
  if (ucs.size < 5000) throw new Error(`UCS の衛星が ${ucs.size} 機しかありません。ファイルが壊れているかもしれません`);
  const out = join(appDir, UCS_JSON);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(Object.fromEntries(ucs)));
  console.log(`${UCS_JSON} に ${ucs.size} 機を書きました`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
