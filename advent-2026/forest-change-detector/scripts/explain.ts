// AI による「変化の理由の候補」（事前に1回。公開デモでは AI を呼ばない）
//   pnpm explain      （先に scripts/pipeline.py と scripts/osm_context.py を実行しておく）
// 面積の大きい順に12か所について、前後の衛星画像の切り抜きと、コードが出した数字を Claude に見せる
import { checkNumbers, generateObject } from "@advent/ai";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(appDir, "analysis", "rondonia");
const TOP = 12;

export const CAUSES = ["牧草地・農地への転換", "道路沿いの伐採", "火災", "選択的な伐採（森の劣化）", "川や水辺の変化", "見かけの変化（雲・影・季節）", "その他・不明"] as const;

const Schema = z.object({
  candidates: z
    .array(
      z.object({
        cause: z.enum(CAUSES),
        likelihood: z.enum(["高い", "中くらい", "低い"]),
        evidence: z.string().describe("画像や数字のどこからそう考えたか。1〜2文"),
      }),
    )
    .min(1)
    .max(3),
  summary: z.string().describe("この場所で何が起きたかを、2文程度で"),
});

const SYSTEM = `あなたは衛星画像を読み慣れた環境の研究者です。ブラジル・アマゾンの森で、植物の量の指標（NDVI）が大きく下がった場所について、何が起きたかの候補を挙げます。

渡すもの：前の年（森だったころ）と後の年の、同じ場所のトゥルーカラーの衛星画像の切り抜き（中央が変化した場所）と、コードが計算した数字。

守ること：
- 理由の候補を1〜3個、ありそうな順に。見えるもの（四角い切り開き、焼け跡の黒っぽい色、道路の線、緑の草地など）を根拠に書く
- 断定しない。「〜と考えられる」「〜の可能性」と書く
- 数字は渡された値をそのまま使い、新しい数字を作らない
- OpenStreetMap には、この地域の農道・林道の多くが登録されていない。「近くに道路がない」とは書かず、「地図に登録された道路からは遠い」と書く
- 日本語で書く`;

interface Patch {
  id: number;
  area_ha: number;
  lat: number;
  lon: number;
  ndvi_before: number;
  ndvi_after: number;
  ndvi_drop: number;
  context?: { road_m: number | null; road_type: string | null; road_name: string | null; river_m: number | null };
}

async function main() {
  const meta = JSON.parse(readFileSync(join(dataDir, "result.json"), "utf8"));
  const out: Record<string, unknown> = {};
  for (const p of (meta.patches as Patch[]).slice(0, TOP)) {
    const img = (tag: string) => readFileSync(join(dataDir, "crops", `${p.id}-${tag}.jpg`)).toString("base64");
    const facts = {
      面積_ha: p.area_ha,
      前の年のNDVI: p.ndvi_before,
      後の年のNDVI: p.ndvi_after,
      "NDVIの下がり方（年ごとのずれを除いた値）": p.ndvi_drop,
      前の年の画像の日付: meta.before.date,
      後の年の画像の日付: meta.after.date,
      "地図に登録された一番近い道路までの距離_m": p.context?.road_m ?? null,
      その道路の種類: p.context?.road_type ?? null,
      その道路の名前: p.context?.road_name ?? null,
      "地図に登録された一番近い川までの距離_m": p.context?.river_m ?? null,
    };
    const r = await generateObject({
      label: "forest-change/explain",
      system: SYSTEM,
      prompt: [
        { type: "text", text: "前の年の画像：" },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: img("before") } },
        { type: "text", text: "後の年の画像：" },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: img("after") } },
        { type: "text", text: `数字（コードが計算した値）：\n${JSON.stringify(facts, null, 1)}` },
      ],
      schema: Schema,
      effort: "medium",
    });
    const allowed = JSON.stringify(facts).match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const text = [r.summary, ...r.candidates.map((c) => c.evidence)].join("\n");
    const unmatched = checkNumbers(text, allowed, {
      ignore: (n) => Number.isInteger(n.value) && Math.abs(n.value) <= 10 && !n.percent,
    }).unmatched.map((n) => n.raw);
    out[p.id] = { ...r, unmatchedNumbers: unmatched };
    process.stderr.write(`#${p.id} ${p.area_ha}ha → ${r.candidates.map((c) => `${c.cause}(${c.likelihood})`).join("・")}${unmatched.length ? ` ⚠数字 ${unmatched.join(",")}` : ""}\n`);
  }
  writeFileSync(join(dataDir, "explanations.json"), JSON.stringify(out, null, 1));
}

main();
