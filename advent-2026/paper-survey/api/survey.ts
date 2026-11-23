// POST /api/survey  { theme: string, fromYear?: number }
// 返り値は NDJSON（1行1イベント）のストリーム：
//   {"type":"queries", ...} → {"type":"papers", ...} → {"type":"text","delta":"..."}... → {"type":"check", ...} → {"type":"done", ...}
// エラーは {"type":"error","message":"..."}。
// キーとメールアドレスはサーバー側だけで使う。
import { dailyLimit, getStore, hashKey } from "@advent/store";
import { findOaLinks } from "../lib/oa-links.js";
import { findPapers } from "../lib/pipeline.js";
import { checkSurvey, streamSurvey } from "../lib/survey.js";

const DAILY_LIMIT = 10; // 全体で1日10回（Sonnet 5.5 で1回約10円）
const PER_IP_LIMIT = 3;
const CACHE_TTL = 60 * 60 * 24 * 30; // 同じテーマは30日キャッシュ
const TOP_K = 20;

type Event = Record<string, unknown> & { type: string };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

export async function POST(request: Request): Promise<Response> {
  let body: { theme?: unknown; fromYear?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "JSON で送ってください" });
  }
  const theme = typeof body.theme === "string" ? body.theme.trim().replace(/\s+/g, " ") : "";
  if (theme.length < 2 || theme.length > 100) return json(400, { error: "テーマは2〜100文字で入力してください" });
  const thisYear = new Date().getFullYear();
  const fromYear = Number(body.fromYear ?? thisYear - 10);
  if (!Number.isInteger(fromYear) || fromYear < 1950 || fromYear > thisYear) {
    return json(400, { error: "開始年が正しくありません" });
  }

  const store = getStore();
  const cacheKey = `paper-survey:cache:${await hashKey(`${theme.toLowerCase()}|${fromYear}`)}`;
  const cached = await store.get(cacheKey);

  if (!cached) {
    const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
    const limited = await dailyLimit(store, { app: "paper-survey", ip, total: DAILY_LIMIT, perIp: PER_IP_LIMIT });
    if (limited) return json(429, { error: `${limited}（過去に調べたテーマは何度でも見られます）` });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: Event) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        if (cached) {
          for (const e of JSON.parse(cached) as Event[]) send(e.type === "done" ? { ...e, cached: true } : e);
          return;
        }
        const events: Event[] = [];
        const emit = (e: Event) => {
          events.push(e);
          send(e);
        };

        const found = await findPapers(theme, { fromYear });
        emit({ type: "queries", englishTheme: found.englishTheme, queries: found.queries, candidateCount: found.candidateCount });
        const top = found.ranked.slice(0, TOP_K);
        if (top.length === 0) {
          emit({ type: "error", message: "論文が見つかりませんでした。テーマの言い方や期間を変えてみてください" });
          return;
        }
        const links = await findOaLinks(top);
        emit({
          type: "papers",
          papers: top.map((p, i) => ({
            n: i + 1,
            id: p.id,
            title: p.title,
            year: p.year,
            citedBy: p.citedBy,
            venue: p.venue,
            firstAuthor: p.firstAuthor,
            doi: p.doi,
            oaUrl: links[i].url,
            oaSource: links[i].source,
            score: p.score,
          })),
        });

        let text = "";
        for await (const delta of streamSurvey(theme, top)) {
          text += delta;
          send({ type: "text", delta });
        }
        // キャッシュには細切れの delta ではなく、まとめた本文を1つ入れる
        events.push({ type: "text", delta: text });
        emit({ type: "check", ...checkSurvey(text, top) });
        emit({ type: "done", generatedAt: new Date().toISOString() });
        await store.set(cacheKey, JSON.stringify(events), CACHE_TTL);
      } catch (err) {
        console.error(err);
        send({ type: "error", message: "途中でエラーが起きました。時間をおいて試してください" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
