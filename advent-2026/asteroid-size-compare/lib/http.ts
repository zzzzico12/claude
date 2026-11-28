// API の共通部分：JSON の応答とエラー
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(status: number, body: unknown, cache?: string): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" };
  if (cache) headers["Cache-Control"] = cache;
  return new Response(JSON.stringify(body, null, 1), { status, headers });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json(err.status, { error: err.message });
  console.error(err);
  return json(500, { error: "内部エラーが起きました。時間をおいて試してください" });
}
