// Voyage AI の埋め込み（ベクトル化）。日本語の課題と英語の特許・要約を、同じ空間のベクトルにする
// https://docs.voyageai.com/reference/embeddings-api （2026-11-26 に確認）
// - voyage-4 は多言語の検索向け。最初の2億トークンは無料
// - 支払い方法を登録していないアカウントは「1分に3回・1万トークン」まで（2026-11-26 に 429 の返事で確認）。
//   この制限の中で動くように、1回に送るのは約8千トークンまで、送る間隔は21秒以上、429 なら待ってやり直す
// - 512次元・int8 にして、特許 約600件のベクトルを 300KB ほどに収める
export const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
export const VOYAGE_MODEL = () => process.env.VOYAGE_MODEL || "voyage-4";
export const DIM = 512;
const MAX_TOKENS_PER_REQUEST = 8000;
const MIN_GAP_MS = 21_000; // 1分に3回
const TOKENS_PER_MIN = 10_000;
const RETRY_WAIT_MS = 22_000;
const MAX_RETRIES = 2;

export class VoyageKeyMissing extends Error {
  constructor() {
    super("VOYAGE_API_KEY がありません（.env か Vercel の環境変数に入れてください）");
  }
}

export class VoyageBusy extends Error {
  constructor() {
    super("ベクトル化の API が混み合っています。1分ほど待ってからもう一度試してください");
  }
}

/** トークン数のおおまかな見積もり（英語は約4文字で1トークン、日本語は1文字で約1トークン） */
export const estimateTokens = (s: string) => Math.ceil(s.replace(/[^\x00-\x7F]/g, "").length / 4 + s.replace(/[\x00-\x7F]/g, "").length);

/** 見積もりのトークン数が上限を超えないように分ける */
export function batches(texts: string[], max = MAX_TOKENS_PER_REQUEST): number[][] {
  const out: number[][] = [];
  let cur: number[] = [];
  let tokens = 0;
  texts.forEach((t, i) => {
    const n = estimateTokens(t);
    if (cur.length && (tokens + n > max || cur.length >= 1000)) {
      out.push(cur);
      cur = [];
      tokens = 0;
    }
    cur.push(i);
    tokens += n;
  });
  if (cur.length) out.push(cur);
  return out;
}

let lastRequest = 0;
let lastTokens = 0;
/** 前回送った量から、次に送れるまでの間隔（回数の制限と、トークン数の制限の厳しいほう） */
const gapAfterLast = () => Math.max(MIN_GAP_MS, Math.ceil((lastTokens / TOKENS_PER_MIN) * 60_000));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * texts をベクトルにする。maxWaitMs を超えて待つ必要があるときは VoyageBusy を投げる
 * （API では長く待てないので短め、事前の準備では長くてよい）
 */
export async function embed(texts: string[], inputType: "query" | "document", opts: { maxWaitMs?: number; retries?: number; log?: (s: string) => void } = {}): Promise<Int8Array[]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new VoyageKeyMissing();
  const maxWait = opts.maxWaitMs ?? Infinity;
  const out: Int8Array[] = new Array(texts.length);
  const groups = batches(texts);
  for (const [gi, idx] of groups.entries()) {
    let waited = 0;
    for (let attempt = 0; ; attempt++) {
      const gap = lastRequest + gapAfterLast() - Date.now();
      if (gap > 0 && gi > 0) {
        if (waited + gap > maxWait) throw new VoyageBusy();
        await sleep(gap);
        waited += gap;
      }
      lastRequest = Date.now();
      lastTokens = idx.reduce((n, i) => n + estimateTokens(texts[i]), 0);
      const res = await fetch(VOYAGE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input: idx.map((i) => texts[i]), model: VOYAGE_MODEL(), input_type: inputType, output_dimension: DIM, output_dtype: "int8" }),
      });
      if (res.status === 429 && attempt < (opts.retries ?? MAX_RETRIES) && waited + RETRY_WAIT_MS <= maxWait) {
        opts.log?.(`  429（回数の制限）。${RETRY_WAIT_MS / 1000}秒待ってやり直す`);
        await sleep(RETRY_WAIT_MS);
        waited += RETRY_WAIT_MS;
        continue;
      }
      if (res.status === 429) throw new VoyageBusy();
      if (!res.ok) throw new Error(`Voyage が HTTP ${res.status} を返しました：${(await res.text()).slice(0, 200)}`);
      const j = (await res.json()) as { data: { index: number; embedding: number[] }[] };
      for (const d of j.data) out[idx[d.index]] = Int8Array.from(d.embedding);
      opts.log?.(`  ${gi + 1}/${groups.length} 回目（${idx.length}件）`);
      break;
    }
  }
  return out;
}

/** コサイン類似度（-1〜1） */
export function cosine(a: Int8Array, b: Int8Array): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** 保存用：int8 のベクトル ⇔ base64 */
export const toB64 = (v: Int8Array) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");
export const fromB64 = (s: string) => {
  const b = Buffer.from(s, "base64");
  return new Int8Array(b.buffer, b.byteOffset, b.byteLength);
};
