// テーマを作る（事前に1回。拡張機能の中では AI を呼ばない）
//   pnpm themes            （advent-2026/.env の ANTHROPIC_API_KEY を使う）
// 1. シカゴ美術館から作品と画像を取る（画像は data/ に保存。Git管理外）
// 2. 画像から代表色を14色取り出す（k-means）
// 3. Claude が画像を見て、どの色を背景・キーワード・コメントなどに使うかを決め、絵の解説と雰囲気（晴れ・雨・夜…）を書く
// 4. コードで、AI の選んだ色をパレットの色にそろえ、読みやすさ（WCAG AA）を満たすよう調整してテーマを書き出す
import { checkNumbers, generateObject } from "@advent/ai";
import { fetchImage, getAicArtwork, type Artwork } from "@advent/museum-data";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { colorDifference } from "../lib/color.js";
import { extractPalette, type PaletteColor } from "../lib/palette.js";
import { MOODS, type PaintingInfo } from "../lib/paintings.js";
import { buildTheme, type Roles } from "../lib/theme.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");

// シカゴ美術館のパブリックドメインの作品（晴れ・雨・雪・夜・夕方などの雰囲気がばらけるように選んだ）
const PAINTINGS = [
  20684, 27992, 28560, 16568, 16560, 81545, 64818, 14624, 24645, 4371, 56905, 14620, 81557, 72801, 4796, 16343, 154235,
];

const RoleSchema = z.object({
  title_ja: z.string().describe("作品名の日本語訳（定着した訳があればそれ）"),
  artist_ja: z.string().describe("作者名のカタカナ表記（日本人は漢字）"),
  type: z.enum(["dark", "light"]).describe("ダークテーマかライトテーマか"),
  background: z.string(),
  foreground: z.string(),
  accent: z.string(),
  keyword: z.string(),
  string: z.string(),
  number: z.string(),
  function: z.string(),
  type_color: z.string().describe("型・クラス名の色"),
  comment: z.string(),
  explanation: z.string().describe("作品の解説。日本語で2〜3文"),
  color_story: z.string().describe("この配色にした理由。日本語で1〜2文"),
  moods: z.array(z.enum(MOODS)).min(1).max(3).describe("絵の雰囲気"),
});

const SYSTEM = `あなたは配色に詳しいデザイナーで、美術にも詳しい。名画の色から、プログラマーが毎日使うエディタの配色（VS Code のテーマ）を作る。

色の選び方：
- 色は必ず、渡されたパレットの16進数の色の中から選ぶ。新しい色を作らない
- background（背景）は絵の中で面積の大きい色から選ぶ。暗い絵ならダーク（type: dark）、明るい絵ならライト（type: light）にする
- foreground（ふつうの文字）は背景とよく対比する色
- keyword・string・function・type_color はできるだけ色相の違う色にして、コードの構造が見分けやすいようにする
- comment は落ち着いた（彩度の低い）色
- accent は絵を特徴づける色（ステータスバーやボタンに使う）。accent: true の色は、絵の中の灯りや服などの小さく鮮やかな色なので、keyword や accent に向く
- 文字の読みやすさは後でプログラムが調整するので、絵の雰囲気を優先してよい。ただし、調整が少なくて済む（背景と明るさの差が大きい）色を選べると良い

文章：
- explanation：何が描かれ、どんな作品かを2〜3文で。数字は書かない（制作年も書かない。年は画面に別に出す）
- color_story：なぜこの配色にしたかを1〜2文で。数字は書かない
- moods：絵の雰囲気を、clear（晴れ）・cloudy（くもり）・rain（雨）・snow（雪）・storm（嵐・強い風）・night（夜）・dusk（夕方）・dawn（朝）から1〜3個`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

/** AI が選んだ色を、いちばん近いパレットの色にそろえる（パレット以外の色を使わせない） */
function snap(hex: string, palette: PaletteColor[]): string {
  const norm = /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : palette[0].hex;
  return palette.reduce((best, c) => (colorDifference(norm, c.hex) < colorDifference(norm, best.hex) ? c : best)).hex;
}

/** 比較用：AI を使わない機械的な割り当て（明るさと彩度の順） */
export function naiveRoles(palette: PaletteColor[]): Roles {
  const meanL = palette.reduce((s, c) => s + c.lightness * c.share, 0) / palette.reduce((s, c) => s + c.share, 0);
  const type = meanL < 0.55 ? "dark" : "light";
  const byL = [...palette].sort((a, b) => a.lightness - b.lightness);
  const background = type === "dark" ? byL[0] : byL[byL.length - 1];
  const foreground = type === "dark" ? byL[byL.length - 1] : byL[0];
  const rest = palette.filter((c) => c !== background && c !== foreground).sort((a, b) => b.chroma - a.chroma);
  const pick = (i: number) => (rest[i] ?? rest[rest.length - 1] ?? foreground).hex;
  return {
    type,
    background: background.hex,
    foreground: foreground.hex,
    accent: pick(0),
    keyword: pick(0),
    string: pick(1),
    function: pick(2),
    type_: pick(3),
    number: pick(4),
    comment: (rest[rest.length - 1] ?? foreground).hex,
  };
}

async function loadImage(art: Artwork): Promise<Uint8Array> {
  const file = join(appDir, "data", "images", `${art.id}.jpg`);
  if (existsSync(file)) return readFileSync(file);
  mkdirSync(dirname(file), { recursive: true });
  const bytes = await fetchImage(art.imageUrl!(400));
  writeFileSync(file, bytes);
  await new Promise((r) => setTimeout(r, 500)); // 美術館に負荷をかけない
  return bytes;
}

async function main() {
  const infos: PaintingInfo[] = [];
  for (const id of PAINTINGS) {
    const art = await getAicArtwork(id);
    if (!art.isPublicDomain || !art.imageUrl) throw new Error(`${id} はパブリックドメインでないか、画像がない`);
    const image = await loadImage(art);
    const palette = extractPalette(image, 12, 4);

    const ai = await generateObject({
      label: "masterpiece-theme/roles",
      system: SYSTEM,
      prompt: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: Buffer.from(image).toString("base64") } },
        {
          type: "text",
          text: `作品：${art.title}（${art.artist ?? "作者不詳"}、${art.date ?? ""}）\nパレット（多い順。share は面積の割合、lightness は明るさ0〜1、chroma は彩度。accent: true は面積は小さいが鮮やかな色）：\n${JSON.stringify(palette)}`,
        },
      ],
      schema: RoleSchema,
      effort: "medium",
    });

    const roles: Roles = {
      type: ai.type,
      background: snap(ai.background, palette),
      foreground: snap(ai.foreground, palette),
      accent: snap(ai.accent, palette),
      keyword: snap(ai.keyword, palette),
      string: snap(ai.string, palette),
      number: snap(ai.number, palette),
      function: snap(ai.function, palette),
      type_: snap(ai.type_color, palette),
      comment: snap(ai.comment, palette),
    };
    const offPalette = Object.entries({ ...ai, type_: ai.type_color })
      .filter(([k, v]) => k in roles && k !== "type" && typeof v === "string" && v.toLowerCase() !== (roles as unknown as Record<string, string>)[k])
      .map(([k]) => k);

    const slug = `${slugify(art.artist ?? "anon")}-${slugify(art.title)}`.slice(0, 60);
    const label = `名画: ${ai.title_ja}（${ai.artist_ja}）`;
    const built = buildTheme(label, roles);
    writeFileSync(join(appDir, "themes", `${slug}.json`), JSON.stringify(built.json, null, 2) + "\n");

    // 解説に数字が入っていないか（年も書かせない指示）
    const unmatched = [ai.explanation, ai.color_story].flatMap((t) => checkNumbers(t, []).unmatched.map((n) => n.raw));

    infos.push({
      id: art.id,
      slug,
      label,
      titleJa: ai.title_ja,
      artistJa: ai.artist_ja,
      title: art.title,
      artist: art.artist,
      date: art.date,
      moods: ai.moods,
      explanation: ai.explanation,
      colorStory: ai.color_story,
      imageUrl: art.imageUrl(843),
      pageUrl: art.pageUrl,
      credit: art.credit,
      license: art.license,
      palette,
      roles,
      naiveRoles: naiveRoles(palette),
      adjustments: built.adjustments,
      checks: { offPaletteRoles: offPalette, unmatchedNumbers: unmatched },
    });
    process.stderr.write(`${label} ${roles.type} moods=${ai.moods.join(",")} 調整ΔE平均=${(built.adjustments.reduce((s, a) => s + a.deltaE, 0) / built.adjustments.length).toFixed(1)}\n`);
  }

  writeFileSync(join(appDir, "lib", "paintings-data.json"), JSON.stringify(infos, null, 2) + "\n");

  // 拡張機能のマニフェスト（package.json）にテーマを登録する
  const pkgFile = join(appDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
  pkg.contributes = {
    ...pkg.contributes,
    themes: infos.map((p) => ({ label: p.label, uiTheme: p.roles.type === "dark" ? "vs-dark" : "vs", path: `./themes/${p.slug}.json` })),
  };
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
  process.stderr.write(`テーマ ${infos.length} 個を書き出しました\n`);
}

main();
