// API の共通部分：JSON の応答とエラー
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const CORS = {
  // ほかのサイトや手元のスクリプトからも呼べる API にする（キーはサーバー側だけで使う）
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function json(status: number, body: unknown, cache?: string): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8", ...CORS };
  if (cache) headers["Cache-Control"] = cache;
  return new Response(JSON.stringify(body, null, 1), { status, headers });
}

/** ブラウザがほかのサイトから POST するときの事前確認 */
export const preflight = () => new Response(null, { status: 204, headers: CORS });

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json(err.status, { error: err.message });
  console.error(err);
  return json(500, { error: "内部エラーが起きました。時間をおいて試してください" });
}
