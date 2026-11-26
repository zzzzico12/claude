// Voyage AI の埋め込み（ベクトル化）。日本語の課題と英語の特許・要約を、同じ空間のベクトルにする
// https://docs.voyageai.com/reference/embeddings-api （2026-11-26 に確認）
// - voyage-4 は多言語の検索向け。最初の2億トークンは無料
// - 512次元・int8 にして、特許 約600件のベクトルを 300KB ほどに収める
export const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
export const VOYAGE_MODEL = () => process.env.VOYAGE_MODEL || "voyage-4";
export const DIM = 512;
/** 1回に送る件数（上限 1,000件・32万トークン。説明文は1件 約300トークンなので余裕を持たせる） */
const BATCH = 128;

export class VoyageKeyMissing extends Error {
  constructor() {
    super("VOYAGE_API_KEY がありません（.env か Vercel の環境変数に入れてください）");
  }
}

export async function embed(texts: string[], inputType: "query" | "document"): Promise<Int8Array[]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new VoyageKeyMissing();
  const out: Int8Array[] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const input = texts.slice(i, i + BATCH);
    const res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input, model: VOYAGE_MODEL(), input_type: inputType, output_dimension: DIM, output_dtype: "int8" }),
    });
    if (!res.ok) throw new Error(`Voyage が HTTP ${res.status} を返しました：${(await res.text()).slice(0, 200)}`);
    const j = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    for (const d of j.data.sort((a, b) => a.index - b.index)) out.push(Int8Array.from(d.embedding));
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
