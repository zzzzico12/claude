# packages/ai：AIの呼び出し

- **使う日**：全日
- **役割**：Claude APIの呼び出し、モデル名の設定、トークン数と料金の記録、AIの文章に出てくる数字の照合をまとめる

## 使い方

```ts
import { generateText, generateObject, checkNumbers, ignoreYears } from "@advent/ai";
import { z } from "zod";

// 文章を作る（説明・要約など）
const text = await generateText({
  label: "voyager-explain",                 // ログで見分ける名前
  system: "あなたは宇宙の解説者です。…",       // 固定の指示（キャッシュされる）
  prompt: `距離: ${distanceKm} km`,          // 変わる値はこちらへ
});

// 数字の照合：AIの文章の数字が、コードで計算した値のどれかと合っているか
const check = checkNumbers(text, [distanceKm, lightHours], { ignore: ignoreYears });
if (!check.ok) console.warn("照合できない数字", check.unmatched);

// 決まった形のJSONを返させる（AIに判断させ、結果をコードで使う）
const roles = await generateObject({
  prompt: "この配色のうち、背景・キーワード・コメントに向く色は？…",
  schema: z.object({ background: z.string(), keyword: z.string(), comment: z.string() }),
});
```

## 決めていること

- **モデル**：引数 `model` → 環境変数 `CLAUDE_MODEL` → `claude-opus-5-5` の順に決まる
- **effort（考える深さ）**：既定は `low`。説明文を作るにはこれで足りることが多い。難しい判断をさせる日は `effort: "medium"` 以上にする
- **キャッシュ**：`system` は毎回キャッシュの対象にする。日時など毎回変わる値は `system` に入れない（キャッシュが効かなくなる）
- **料金の記録**：呼ぶたびに `{"type":"claude_usage", ...}` を1行のJSONとしてログに出す（Vercelのログで見られる）。`onUsage` を渡すと差し替えられる。料金表は `src/pricing.ts`
- **拒否への対応**：Opus 5.5 / Sonnet 5.5 では、安全上の理由で回答を断られたときに、サーバー側で別のモデルが代わりに答える（`fallbacks: "default"`）。それでも断られたら `AiRefusalError` を投げる
- **途中で切れた回答**：`max_tokens` に達したら `AiTruncatedError` を投げる

## 確認

- `pnpm --filter @advent/ai test`：APIを呼ばないテスト
- `pnpm --filter @advent/ai smoke`：`advent-2026/.env` のキーで実際にAPIを2回呼ぶ（料金は1円未満）
