// Claude API の呼び出しをまとめる。各アプリの Vercel Functions と、Node のスクリプト（評価など）の両方から使う。
// - モデル名は環境変数 CLAUDE_MODEL（未設定なら DEFAULT_MODEL）
// - システムプロンプトはキャッシュ対象にする（短いと API 側で黙ってキャッシュされないだけで害はない）
// - トークン数と料金を onUsage に渡す（既定は 1 行の JSON を console.info に出す → Vercel のログで見られる）
// - 安全のための拒否（refusal）は、対応モデルではサーバー側フォールバックで別モデルが代わりに答える
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { estimateCostUsd, type TokenUsage } from "./pricing.js";

export const DEFAULT_MODEL = "claude-opus-5-5";

// サーバー側フォールバック（fallbacks: "default"）に対応しているモデル
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface UsageRecord extends TokenUsage {
  /** どの処理の呼び出しか（ログで見分ける用） */
  label?: string;
  requestedModel: string;
  /** 実際に応答したモデル（フォールバックが動いた場合は requestedModel と違う） */
  servedModel: string;
  costUsd: number | null;
  durationMs: number;
}

export interface GenerateOptions {
  /** 指示（固定の内容にするとキャッシュが効く。日時などの変わる値は prompt 側に入れる） */
  system?: string;
  prompt: string | Anthropic.Beta.BetaContentBlockParam[];
  /** 会話の続きなど。指定すると prompt はその後ろに user として付く */
  history?: Anthropic.Beta.BetaMessageParam[];
  model?: string;
  /** 既定 "low"。説明文の生成にはこれで十分なことが多い。難しい判断をさせるときに上げる */
  effort?: Effort;
  maxTokens?: number;
  label?: string;
  /** テストで差し替える用 */
  client?: Anthropic;
  onUsage?: (u: UsageRecord) => void;
}

export class AiRefusalError extends Error {
  constructor(
    public category: string | null,
    public explanation: string | null,
  ) {
    super(`Claude が回答を断りました（category: ${category ?? "不明"}）`);
    this.name = "AiRefusalError";
  }
}

export class AiTruncatedError extends Error {
  constructor(public partialText: string) {
    super("max_tokens に達して回答が途中で切れました。maxTokens を増やしてください");
    this.name = "AiTruncatedError";
  }
}

let sharedClient: Anthropic | undefined;
/** ANTHROPIC_API_KEY などを環境変数から読むクライアント（使い回す） */
export function getClient(): Anthropic {
  sharedClient ??= new Anthropic();
  return sharedClient;
}

export function resolveModel(model?: string): string {
  return model ?? process.env.CLAUDE_MODEL ?? DEFAULT_MODEL;
}

export const logUsage = (u: UsageRecord) => console.info(JSON.stringify({ type: "claude_usage", ...u }));

function buildParams(opts: GenerateOptions, model: string) {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...(opts.history ?? []),
    { role: "user", content: opts.prompt },
  ];
  const useFallback = FALLBACK_MODELS.has(model);
  return {
    model,
    max_tokens: opts.maxTokens ?? 16000,
    ...(opts.system
      ? { system: [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }] }
      : {}),
    messages,
    ...(useFallback ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {}),
  };
}

function finish(
  opts: GenerateOptions,
  requestedModel: string,
  started: number,
  res: Anthropic.Beta.BetaMessage,
): string {
  const text = res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const usage: TokenUsage = {
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
    cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: res.usage.cache_creation_input_tokens ?? 0,
  };
  (opts.onUsage ?? logUsage)({
    label: opts.label,
    requestedModel,
    servedModel: res.model,
    ...usage,
    costUsd: estimateCostUsd(res.model, usage),
    durationMs: Date.now() - started,
  });
  if (res.stop_reason === "refusal") {
    throw new AiRefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? null);
  }
  if (res.stop_reason === "max_tokens") throw new AiTruncatedError(text);
  return text;
}

/** 文章を生成して返す */
export async function generateText(opts: GenerateOptions): Promise<string> {
  const model = resolveModel(opts.model);
  const started = Date.now();
  const res = await (opts.client ?? getClient()).beta.messages.create({
    ...buildParams(opts, model),
    output_config: { effort: opts.effort ?? "low" },
  });
  return finish(opts, model, started, res);
}

/**
 * 文章を少しずつ受け取る（長い文章を画面に順に出すとき用）。
 * 最後まで受け取ると、generateText と同じく使用量を記録し、拒否・途中切れはエラーにする。
 */
export async function* streamText(opts: GenerateOptions): AsyncGenerator<string, void> {
  const model = resolveModel(opts.model);
  const started = Date.now();
  const stream = (opts.client ?? getClient()).beta.messages.stream({
    ...buildParams(opts, model),
    output_config: { effort: opts.effort ?? "low" },
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  finish(opts, model, started, await stream.finalMessage());
}

/**
 * Zod のスキーマに沿った JSON を生成して、検証済みのオブジェクトを返す。
 * 「どの色をどこに割り当てるか」のような、AI に判断させて結果をコードで使う場面向け。
 */
export async function generateObject<S extends z.ZodType>(
  opts: GenerateOptions & { schema: S },
): Promise<z.infer<S>> {
  const model = resolveModel(opts.model);
  const started = Date.now();
  const res = await (opts.client ?? getClient()).beta.messages.parse({
    ...buildParams(opts, model),
    output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
  });
  finish(opts, model, started, res);
  if (res.parsed_output == null) throw new Error("構造化出力のパースに失敗しました");
  return res.parsed_output as z.infer<S>;
}
