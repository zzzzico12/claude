// 実際に Claude API を 2 回呼んで動作を確かめる（料金は 1 円未満）。
// 使い方: advent-2026/.env にキーを入れてから `pnpm --filter @advent/ai smoke`
import { z } from "zod";
import { checkNumbers, generateObject, generateText } from "../dist/index.js";

const text = await generateText({
  label: "smoke-text",
  system: "あなたは天文の解説者です。日本語で1文だけ答えます。",
  prompt: "地球から月までの平均距離は384,400kmです。この数字を使って一言で紹介してください。",
});
console.log("text:", text);
console.log("numbers:", checkNumbers(text, [384400]));

const obj = await generateObject({
  label: "smoke-object",
  prompt: "富士山の標高（3776m）と、東京タワーの高さ（333m）をJSONで返して",
  schema: z.object({ fuji_m: z.number(), tokyo_tower_m: z.number() }),
});
console.log("object:", obj);
