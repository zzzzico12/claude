// 「札幌で今週いちばん見やすいのは？」に自然文で答える
// AI がするのは2つだけ：
//   1. 質問から、場所・日数・衛星を取り出す（generateObject。計算はしない）
//   2. コードが計算して順位を付けた通過の一覧をもとに、答えを文章にする（数字は照合する）
import { checkNumbers, generateObject, generateText, ignoreYears } from "@advent/ai";
import { z } from "zod";
import type { Prediction } from "./predict.js";

export type Lang = "ja" | "en";

export const QuestionSchema = z.object({
  place: z.string().nullable().describe("地名。ジオコーダーで見つかりやすい形（日本の地名は「札幌市」「東京都」のように正式な名前、海外は英語）。質問に地名がなければ null"),
  days: z.number().int().min(1).max(7).nullable().describe("何日先まで調べるか。「今夜」「今日」は1、「明日まで」は2、「今週」「1週間」は7。書いていなければ null"),
  satellite: z.string().nullable().describe("衛星の名前（ISS・天宮・ハッブルなど）。書いていなければ null"),
});
export type Question = z.infer<typeof QuestionSchema>;

const EXTRACT_SYSTEM = `利用者の質問から、人工衛星の通過を調べるための条件を取り出します。答えは書かず、条件だけを返します。
- place：地名。日本の地名は「札幌市」「東京都」「大阪市」のような正式な名前に直す。海外の地名は英語にする。地名がなければ null
- days：何日先まで調べるか（1〜7）。「今夜」「今日」は1、「明日まで」は2、「今週」「1週間」「次の週末まで」は7
- satellite：衛星の名前。なければ null（そのときは ISS を調べる）`;

export async function parseQuestion(question: string): Promise<Question> {
  return generateObject({ label: "satellite-pass-api/parse", system: EXTRACT_SYSTEM, prompt: question.slice(0, 500), schema: QuestionSchema });
}

const ANSWER_SYSTEM: Record<Lang, string> = {
  ja: `あなたは人工衛星の観察に詳しい案内役です。利用者の質問に、コードが計算した通過の一覧（JSON）だけをもとに日本語で答えます。

守ること：
- 時刻・方角・高さ・雲量・点数は、一覧の値をそのまま書く。計算し直したり、新しい数字を作ったりしない
- 「いちばん見やすい」は一覧の rank が 1 のもの。順位を入れ替えない。理由は高さ・雲量・見える時間から言葉で説明する
- 方角は「北西」のように日本語で書く（NW → 北西、NNW → 北北西）
- 雲量の予報がない通過（null）は「雲の予報はまだない」と書く
- 見える通過が1つもなければ、そう伝え、日数を延ばすか別の衛星を試すよう勧める
- 2〜4文、見出しや箇条書きは使わない。最後に、見る時刻の数分前に外に出て目を暗さに慣らすなど、観察のこつを一言`,
  en: `You are a friendly guide to satellite watching. Answer the user's question in English, using only the list of passes (JSON) computed by code.

Rules:
- Write times, directions, elevations, cloud cover and scores exactly as given. Do not recalculate or invent numbers
- "The best one" is the pass with rank 1. Do not reorder. Explain why in words (elevation, clouds, duration)
- Write directions in words (NW → northwest, NNW → north-northwest)
- If cloud cover is null, say there is no cloud forecast yet
- If there are no visible passes, say so and suggest more days or another satellite
- 2 to 4 sentences, no headings or bullet points. End with one observing tip (e.g. go outside a few minutes early to let your eyes adjust)`,
};

const DIR_JA: Record<string, string> = {
  N: "北", NNE: "北北東", NE: "北東", ENE: "東北東", E: "東", ESE: "東南東", SE: "南東", SSE: "南南東",
  S: "南", SSW: "南南西", SW: "南西", WSW: "西南西", W: "西", WNW: "西北西", NW: "北西", NNW: "北北西",
};

/** AI に渡す事実：時刻は観測地の言い方に直した文字列で渡す（数字の照合に使う） */
export function factsFor(p: Prediction, placeName: string | null, lang: Lang) {
  const fmt = new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-US", {
    timeZone: p.location.timezone || "UTC",
    month: lang === "ja" ? "numeric" : "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const top = [...p.passes].sort((a, b) => a.rank - b.rank).slice(0, 5);
  return {
    place: placeName ?? `${p.location.lat}, ${p.location.lon}`,
    timezone: p.location.timezone,
    satellite: p.satellite.name,
    period: `${fmt.format(new Date(p.from))} – ${fmt.format(new Date(p.to))}`,
    visiblePassCount: p.passes.length,
    topPasses: top.map((x) => ({
      rank: x.rank,
      score: x.score,
      appears: fmt.format(new Date(x.start.time)),
      appearsFrom: lang === "ja" ? DIR_JA[x.start.direction] : x.start.direction,
      highestAt: fmt.format(new Date(x.max.time)),
      highestElevationDeg: x.max.elevation,
      highestDirection: lang === "ja" ? DIR_JA[x.max.direction] : x.max.direction,
      disappearsTo: lang === "ja" ? DIR_JA[x.end.direction] : x.end.direction,
      visibleMinutes: Math.round(x.durationSec / 6) / 10,
      endsBy: x.endsBy,
      cloudCoverPercent: x.cloudCover,
    })),
  };
}

export async function answer(question: string, facts: ReturnType<typeof factsFor>, lang: Lang) {
  const text = await generateText({
    label: "satellite-pass-api/answer",
    system: ANSWER_SYSTEM[lang],
    prompt: `${lang === "ja" ? "質問" : "Question"}：${question.slice(0, 500)}\n\n${lang === "ja" ? "通過の一覧（JSON）" : "Passes (JSON)"}：\n${JSON.stringify(facts, null, 1)}`,
  });
  return { text, unmatchedNumbers: unmatched(text, facts) };
}

/** 答えの中の数字のうち、事実にないもの（衛星の名前の番号・年・10 以下の整数は除く） */
export function unmatched(text: string, facts: unknown): string[] {
  const allowed = (JSON.stringify(facts).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const body = text.replace(/\b(?:[A-Z]{2,}[A-Z0-9]*[-‐ ]?\d+|[A-Z][A-Za-z0-9]*[-‐]\d+)[A-Za-z0-9-]*/g, " ");
  const r = checkNumbers(body, [...allowed, ...allowed.map(Math.abs)], {
    ignore: (n) => ignoreYears(n) || (Number.isInteger(n.value) && Math.abs(n.value) <= 10 && !n.percent),
  });
  return r.unmatched.map((n) => n.raw);
}
