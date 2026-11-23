// Warp（ターミナル）用のテーマを作る。AI は使わない（VS Code 用に決めた色の割り当てを使う）
//   pnpm warp             （data/warp-themes/ に作る）
//   pnpm warp --install   （作ったうえで ~/.warp/themes/ にコピーする）
// 背景の絵は幅843pxで取得する（data/images-843/、Git管理外）。ターミナルの画面いっぱいに敷くので、拡張機能の400pxでは粗いため
import { fetchImage, getAicArtwork } from "@advent/museum-data";
import jpeg from "jpeg-js";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RGB } from "../lib/color.js";
import type { PaintingInfo } from "../lib/paintings.js";
import { ensureContrast } from "../lib/color.js";
import { ansiColors, chooseOpacity, TERMINAL_TARGET, warpYaml } from "../lib/terminal.js";
import { buildTheme } from "../lib/theme.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(appDir, "data", "warp-themes");
const install = process.argv.includes("--install");

async function loadLargeImage(id: string): Promise<Uint8Array> {
  const file = join(appDir, "data", "images-843", `${id}.jpg`);
  if (existsSync(file)) return readFileSync(file);
  mkdirSync(dirname(file), { recursive: true });
  const art = await getAicArtwork(id);
  const bytes = await fetchImage(art.imageUrl!(843));
  writeFileSync(file, bytes);
  await new Promise((r) => setTimeout(r, 500)); // 美術館に負荷をかけない
  return bytes;
}

function samplePixels(bytes: Uint8Array, step = 4): RGB[] {
  const img = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  const out: RGB[] = [];
  for (let y = 0; y < img.height; y += step)
    for (let x = 0; x < img.width; x += step) {
      const i = (y * img.width + x) * 4;
      out.push([img.data[i], img.data[i + 1], img.data[i + 2]]);
    }
  return out;
}

async function main() {
  const infos = JSON.parse(readFileSync(join(appDir, "lib", "paintings-data.json"), "utf8")) as PaintingInfo[];
  mkdirSync(outDir, { recursive: true });
  const summary = [];
  for (const p of infos) {
    const bytes = await loadLargeImage(p.id);
    const built = buildTheme(p.label, p.roles);
    const final = Object.fromEntries(built.adjustments.map((a) => [a.role, a.adjusted]));
    const dark = p.roles.type === "dark";
    // ターミナルの文字色は、絵を混ぜる余裕を取って背景に対して 7:1 にする
    const foreground = ensureContrast(final.foreground, final.background, TERMINAL_TARGET);
    const colors = ansiColors(p.palette, final.background, foreground, final.comment, dark);
    const checked = [foreground, colors.bright.black, ...(["red", "green", "yellow", "blue", "magenta", "cyan"] as const).map((n) => colors.normal[n])];
    const choice = chooseOpacity(samplePixels(bytes), final.background, checked);

    const base = `masterpiece-${p.slug}`;
    writeFileSync(join(outDir, `${base}.jpg`), bytes);
    writeFileSync(
      join(outDir, `${base}.yaml`),
      warpYaml({
        name: p.label,
        accent: p.roles.accent,
        cursor: final.keyword,
        background: final.background,
        foreground,
        details: dark ? "darker" : "lighter",
        background_image: { path: `${base}.jpg`, opacity: choice.opacity },
        terminal_colors: colors,
      }),
    );
    summary.push({ id: p.id, slug: p.slug, title: p.titleJa, type: p.roles.type, opacity: choice.opacity, passRate: choice.passRate });
    process.stderr.write(`${p.label} 絵の濃さ ${choice.opacity}（基準を満たす画素 ${(choice.passRate * 100).toFixed(1)}%）\n`);
  }
  writeFileSync(join(appDir, "lib", "warp-summary.json"), JSON.stringify(summary, null, 2) + "\n");

  if (install) {
    const dest = join(homedir(), ".warp", "themes");
    mkdirSync(dest, { recursive: true });
    for (const s of summary) {
      for (const ext of ["yaml", "jpg"]) copyFileSync(join(outDir, `masterpiece-${s.slug}.${ext}`), join(dest, `masterpiece-${s.slug}.${ext}`));
    }
    process.stderr.write(`${dest} に ${summary.length} 個のテーマをコピーしました\n`);
  } else {
    process.stderr.write(`${outDir} に作りました。Warp に入れるには pnpm warp --install\n`);
  }
}

main();
