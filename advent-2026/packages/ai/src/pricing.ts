// モデルごとの料金（USD / 100万トークン）。2026-11 時点の Anthropic API 公開価格。
// 料金が変わったらここだけ直す。表にないモデルは料金 null（ログには出すが金額は出さない）。
export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  /** 5分キャッシュへの書き込み。通常は input の 1.25 倍 */
  cacheWrite: number;
}

const price = (input: number, output: number, cacheRead: number): ModelPrice => ({
  input,
  output,
  cacheRead,
  cacheWrite: input * 1.25,
});

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-opus-5-5": price(4, 20, 0.2),
  "claude-sonnet-5-5": price(2, 10, 0.1),
  // Haiku 5.5 は 10万トークン以下のプロンプトの価格。キャッシュ読み出しは input の 1 割として推定
  "claude-haiku-5-5": price(0.1, 0.5, 0.01),
  // サーバー側フォールバックで応答する可能性があるモデル
  "claude-opus-5": price(5, 25, 0.5),
  "claude-opus-4-8": price(5, 25, 0.5),
  "claude-sonnet-5": price(2, 10, 0.2),
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/** トークン数から料金（USD）を計算する。料金表にないモデルは null */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const p = MODEL_PRICES[model];
  if (!p) return null;
  const usd =
    (usage.inputTokens * p.input +
      usage.outputTokens * p.output +
      usage.cacheReadTokens * p.cacheRead +
      usage.cacheWriteTokens * p.cacheWrite) /
    1_000_000;
  return Math.round(usd * 1e6) / 1e6;
}
