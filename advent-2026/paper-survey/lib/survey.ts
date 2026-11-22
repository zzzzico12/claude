// Claude に任せる2か所：①テーマを英語の検索語にする ②抄録だけを根拠にサーベイを書く
// 書かれた文章は、③根拠の番号と数字をコードで照合する。
import { checkNumbers, extractNumbers, generateObject, ignoreYears, streamText } from "@advent/ai";
import { z } from "zod";
import type { RankedPaper } from "./rank.js";

const QuerySchema = z.object({
  english_theme: z.string().describe("テーマの英訳（短く）"),
  queries: z.array(z.string()).min(2).max(4).describe("OpenAlex のキーワード検索に渡す英語の検索語"),
});

const QUERY_SYSTEM = `You turn a research theme (often written in Japanese) into search queries for the OpenAlex keyword search API.
Rules:
- Return 2 to 4 English queries, each 2 to 6 words.
- The first query is the most direct translation of the theme.
- The others cover common synonyms, abbreviations spelled out, or the standard name researchers use for the topic.
- Do not add words like "survey", "review", or years. Do not broaden the theme to a different topic.`;

export async function makeQueries(theme: string) {
  return generateObject({
    label: "paper-survey/queries",
    system: QUERY_SYSTEM,
    prompt: `Theme: ${theme}`,
    schema: QuerySchema,
  });
}

const SURVEY_SYSTEM = `あなたは研究者向けに論文サーベイを書く専門家です。渡された論文リストの抄録だけを根拠に、日本語でサーベイを書きます。

守ること：
- 根拠は渡された抄録だけ。抄録に書かれていないこと（あなたの知識）で内容を補わない。
- 文や箇条書きの末尾に、根拠にした論文の番号を [3] や [2, 5] の形で必ず付ける。番号はリストにあるものだけを使う。
- 引用数・出版年などの数値は画面の表に出るので、本文には書かない。抄録に書かれた実験の数値を紹介するときだけ、その抄録の数値をそのまま書いてよい。
- 誇張や評価語（「画期的」など）を避け、何を提案し何を示したかを具体的に書く。
- 専門用語は初出で英語を括弧で添える。

出力の形（Markdown）：
## 全体の見取り図
このテーマの研究を3〜5個の流れに分け、それぞれ2〜3文で説明する。

## 流れごとの解説
流れごとに「### 流れの名前」を立て、代表的な論文がそれぞれ何をしたか、論文同士の関係（どれがどれを改良したか、何が違うか）を書く。

## まず読むとよい論文
初めてこのテーマを調べる人向けに、読む順番のおすすめを3本、理由つきで挙げる。

## 論文ごとの要約
リストのすべての論文について、「### [番号] タイトル」の見出しと、2〜3文の要約を書く。`;

function paperBlock(p: RankedPaper, i: number): string {
  return [
    `[${i + 1}] ${p.title}`,
    `著者: ${p.firstAuthor ?? "不明"} ほか / 年: ${p.year} / 掲載: ${p.venue ?? "不明"}`,
    `抄録: ${p.abstract}`,
  ].join("\n");
}

export function surveyPrompt(theme: string, papers: RankedPaper[]): string {
  return `テーマ: ${theme}\n\n論文リスト（${papers.length}本）:\n\n${papers.map(paperBlock).join("\n\n")}`;
}

export function streamSurvey(theme: string, papers: RankedPaper[]) {
  return streamText({
    label: "paper-survey/survey",
    system: SURVEY_SYSTEM,
    prompt: surveyPrompt(theme, papers),
    effort: "low",
  });
}

export interface SurveyCheck {
  /** 本文に出てくる根拠の番号のうち、リストにないもの */
  invalidCitations: number[];
  /** 一度も根拠として使われなかった論文の番号 */
  uncitedPapers: number[];
  /** 元データ（抄録・タイトル・年・引用数）にない数字 */
  unmatchedNumbers: string[];
  citationCount: number;
}

const CITATION_RE = /\[(\d+(?:\s*[,，、]\s*\d+)*)\]/g;

export function citedNumbers(text: string): number[] {
  return [...text.matchAll(CITATION_RE)].flatMap((m) => m[1].split(/[,，、]/).map((s) => Number(s.trim())));
}

export function checkSurvey(text: string, papers: RankedPaper[]): SurveyCheck {
  const cited = citedNumbers(text);
  const valid = new Set(papers.map((_, i) => i + 1));
  const invalidCitations = [...new Set(cited.filter((n) => !valid.has(n)))];
  const uncitedPapers = [...valid].filter((n) => !cited.includes(n));

  // 根拠の番号 [3] と、見出しの番号は数字の照合から外す
  const body = text.replace(CITATION_RE, " ");
  const allowed = [
    ...papers.flatMap((p) => [p.year, p.citedBy, ...extractNumbers(`${p.title} ${p.abstract}`).map((n) => n.value)]),
    papers.length,
  ];
  // 「3つの流れ」「2〜3文」のような小さな数は照合しても意味がないので、10以下の整数は除く
  const numbers = checkNumbers(body, allowed, {
    ignore: (n) => ignoreYears(n) || (Number.isInteger(n.value) && Math.abs(n.value) <= 10 && !n.percent),
  });
  return {
    invalidCitations,
    uncitedPapers,
    unmatchedNumbers: numbers.unmatched.map((n) => n.raw),
    citationCount: cited.length,
  };
}
