import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { AiRefusalError, generateText, type UsageRecord } from "./claude.js";
import { checkNumbers, extractNumbers, ignoreYears } from "./numbers.js";
import { estimateCostUsd } from "./pricing.js";

describe("extractNumbers", () => {
  it("カンマ・小数・万/億・%・全角を読む", () => {
    const vals = extractNumbers("約1.2万本、3,776m、２５％、-3.5度、12億人").map((n) => n.value);
    expect(vals).toEqual([12000, 3776, 25, -3.5, 1.2e9]);
  });
});

describe("英語の単位", () => {
  it("million / billion / 7B を読む。3D や 5G は単位にしない", () => {
    const vals = extractNumbers("45 million papers, a 7B model, 1.5 billion, 3D scenes, 5G").map((n) => n.value);
    expect(vals).toEqual([4.5e7, 7e9, 1.5e9, 3, 5]);
  });
  it("「2万6,669」「1万5000」を1つの数として読む", () => {
    expect(extractNumbers("約2万6,669km²、1万5000ha、3万人").map((n) => n.value)).toEqual([26669, 15000, 30000]);
  });
  it("英語の抄録の数字を日本語で書き直しても一致する", () => {
    expect(checkNumbers("4,500 万本の論文", [4.5e7]).ok).toBe(true);
  });
});

describe("checkNumbers", () => {
  it("丸めた表記は桁の範囲内なら一致", () => {
    expect(checkNumbers("およそ1.2万km", [12345]).ok).toBe(true);
    expect(checkNumbers("およそ1.3万km", [12345]).ok).toBe(false);
  });
  it("パーセントは 0〜1 の割合とも照合する", () => {
    expect(checkNumbers("再現率は45%でした", [0.45]).ok).toBe(true);
  });
  it("知らない数字を unmatched として返す", () => {
    const r = checkNumbers("東京タワー3.2本分、月までの0.8倍", [3.2]);
    expect(r.unmatched.map((n) => n.raw)).toEqual(["0.8"]);
  });
  it("年号は ignoreYears で除ける", () => {
    expect(checkNumbers("1977年に打ち上げ、距離は250億km", [2.5e10], { ignore: ignoreYears }).ok).toBe(true);
  });
});

describe("estimateCostUsd", () => {
  it("料金表から計算する", () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0 };
    expect(estimateCostUsd("claude-sonnet-5-5", usage)).toBe(3);
    expect(estimateCostUsd("unknown-model", usage)).toBeNull();
  });
});

// API を呼ばずに、リクエストの形と応答の扱いを確かめる
function fakeClient(response: Partial<Anthropic.Beta.BetaMessage>) {
  const calls: unknown[] = [];
  const client = {
    beta: {
      messages: {
        create: async (params: unknown) => {
          calls.push(params);
          return {
            model: "claude-sonnet-5-5",
            content: [{ type: "text", text: "こんにちは" }],
            stop_reason: "end_turn",
            stop_details: null,
            usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
            ...response,
          };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

describe("generateText", () => {
  it("システムプロンプトをキャッシュ対象にし、フォールバックを付け、使用量を記録する", async () => {
    const { client, calls } = fakeClient({});
    const usages: UsageRecord[] = [];
    const text = await generateText({
      client,
      model: "claude-sonnet-5-5",
      system: "あなたは解説者です",
      prompt: "挨拶して",
      onUsage: (u) => usages.push(u),
    });
    expect(text).toBe("こんにちは");
    expect(calls[0]).toMatchObject({
      system: [{ cache_control: { type: "ephemeral" } }],
      fallbacks: "default",
      output_config: { effort: "low" },
    });
    expect(usages[0]).toMatchObject({ servedModel: "claude-sonnet-5-5", outputTokens: 5 });
  });

  it("Haiku にはフォールバックを付けない", async () => {
    const { client, calls } = fakeClient({ model: "claude-haiku-5-5" });
    await generateText({ client, model: "claude-haiku-5-5", prompt: "x", onUsage: () => {} });
    expect(calls[0]).not.toHaveProperty("fallbacks");
  });

  it("refusal はエラーにする", async () => {
    const { client } = fakeClient({
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "cyber", explanation: null },
    } as Partial<Anthropic.Beta.BetaMessage>);
    await expect(generateText({ client, prompt: "x", onUsage: () => {} })).rejects.toBeInstanceOf(AiRefusalError);
  });
});
