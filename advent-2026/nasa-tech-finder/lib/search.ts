// 課題（日本語）→ 使えそうな NASA の特許と技術報告書。RAG の流れ：
//   1. Claude①：課題を、英語の「求めている機能」と NTRS 用の検索語にする
//   2. 特許：事前に作ったベクトルと、課題のベクトルの近さで上位を出す
//   3. 報告書：検索語で NTRS をその場で検索し、要約をベクトルにして近さで並べ直す
//   4. Claude②：上位の候補から選んで「なぜ使えそうか」「仕組み」を書く。ID と数字はコードで照合する
import { checkNumbers, extractNumbers, generateObject, ignoreYears } from "@advent/ai";
import { z } from "zod";
import type { Index } from "./index-file.js";
import { reportText, searchNtrsMany, type Report } from "./ntrs.js";
import type { Patent } from "./patents.js";
import { cosine, embed } from "./voyage.js";

export const PATENT_TOP = 8;
export const REPORT_TOP = 6;

// ---------- 1. 課題を読む ----------

export const NeedSchema = z.object({
  needEn: z.string().describe("The capability or technology the user needs, as one or two plain English sentences (not a translation of the whole text)"),
  queries: z.array(z.string()).min(2).max(5).describe("2-5 short English keyword queries (2-4 words each) for searching NASA technical reports"),
  notTechnical: z.boolean().describe("true if the input is not a technical problem at all (e.g. chit-chat)"),
});
export type Need = z.infer<typeof NeedSchema>;

const NEED_SYSTEM = `You turn a problem written in Japanese (or English) into search input for NASA's patent portfolio and technical reports.
- needEn: what capability or technology would solve the problem, in plain English. Focus on the underlying function (e.g. "lightweight thermal insulation that works at very low temperatures"), not the business context.
- queries: short English keyword queries for a full-text search engine. Use technical terms NASA engineers would use. Make them different from each other.
- notTechnical: true only if the text is not asking for any technology.`;

export async function understand(problem: string): Promise<Need> {
  return generateObject({ label: "nasa-tech-finder/need", system: NEED_SYSTEM, prompt: problem.slice(0, 1000), schema: NeedSchema, maxTokens: 1000 });
}

// ---------- 2・3. 探す ----------

export interface Scored<T> {
  item: T;
  /** 課題との近さ（コサイン類似度。-1〜1） */
  score: number;
}

export interface Candidates {
  patents: Scored<Patent>[];
  reports: Scored<Report>[];
  /** NTRS で見つかった件数（並べ直す前） */
  reportsFound: number;
  /** NTRS が返した順のまま（評価で「並べ直さない場合」と比べる用。API の応答には入れない） */
  reportsRaw: Report[];
}

const queryText = (problem: string, need: Need) => `${need.needEn}\n${problem}`;

export function rankPatents(index: Index, q: Int8Array, top = PATENT_TOP): Scored<Patent>[] {
  return index.patents
    .map(({ v, ...p }) => ({ item: p, score: cosine(q, v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}

export async function findCandidates(index: Index, problem: string, need: Need): Promise<Candidates> {
  const [q] = await embed([queryText(problem, need)], "query");
  const patents = rankPatents(index, q);
  const found = await searchNtrsMany(need.queries, 20);
  const vecs = found.length ? await embed(found.map(reportText), "document") : [];
  const reports = found
    .map((item, i) => ({ item, score: cosine(q, vecs[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, REPORT_TOP);
  return { patents, reports, reportsFound: found.length, reportsRaw: found };
}

// ---------- 4. 説明する ----------

export const ExplainSchema = z.object({
  overview: z.string().describe("課題に対して NASA の技術がどう役立ちそうかの全体像（日本語で2〜3文）"),
  picks: z
    .array(
      z.object({
        id: z.string().describe("候補の ID をそのまま（特許は LEW-TOPS-168 のような形、報告書は数字）"),
        why: z.string().describe("この課題に使えそうな理由（日本語で1〜2文）"),
        how: z.string().describe("仕組みのやさしい説明（日本語で2〜3文。専門用語には短い言い換えを添える）"),
      }),
    )
    .max(5),
  caution: z.string().describe("使うときの注意（関係が薄い候補しかない、ライセンスの確認が要る、など。日本語で1文）"),
});
export type Explanation = z.infer<typeof ExplainSchema>;

const EXPLAIN_SYSTEM = `あなたは、NASA の特許と技術報告書を、日本の事業者や研究者に紹介する案内役です。
- 渡された候補の中から、課題に本当に使えそうなものを最大5件選び、関係の強い順に並べる。関係が薄いものは選ばない（0件でもよい）
- id は候補の ID をそのまま書く。候補にない技術を書かない
- why・how は、候補の説明文に書いてあることだけをもとにする。書いていない性能の数字や応用例を足さない
- 数字を書くときは、候補の説明文にある数字をそのまま使う
- やさしい日本語で。専門用語には短い言い換えを添える`;

const briefPatent = (s: Scored<Patent>) => ({ id: s.item.id, kind: "特許", title: s.item.title, category: s.item.category, text: s.item.description.slice(0, 1500) });
const briefReport = (s: Scored<Report>) => ({ id: s.item.id, kind: "技術報告書", title: s.item.title, year: s.item.year, text: s.item.abstract.slice(0, 1500) });

export interface Checked {
  explanation: Explanation;
  /** 候補にない ID（除いた） */
  unknownIds: string[];
  /** 候補の説明文と照合できなかった数字 */
  unmatchedNumbers: string[];
}

export async function explain(problem: string, c: Candidates): Promise<Checked> {
  const candidates = [...c.patents.map(briefPatent), ...c.reports.map(briefReport)];
  const raw = await generateObject({
    label: "nasa-tech-finder/explain",
    system: EXPLAIN_SYSTEM,
    prompt: `課題：${problem.slice(0, 1000)}\n\n候補（JSON）：\n${JSON.stringify(candidates, null, 1)}`,
    schema: ExplainSchema,
    maxTokens: 3000,
  });
  return verify(problem, raw, candidates);
}

/** ID は候補にあるものだけ残し、数字は候補の説明文・課題の文にあるものと照合する */
export function verify(problem: string, e: Explanation, candidates: { id: string; title: string; text: string; year?: number | null }[]): Checked {
  const ids = new Set(candidates.map((x) => x.id));
  const unknownIds = e.picks.filter((p) => !ids.has(p.id)).map((p) => p.id);
  const picks = e.picks.filter((p) => ids.has(p.id));
  const allowed = [problem, ...candidates.map((x) => `${x.id} ${x.title} ${x.text} ${x.year ?? ""}`)].flatMap((t) => extractNumbers(t).map((n) => n.value));
  const text = [e.overview, e.caution, ...picks.flatMap((p) => [p.why, p.how])].join("\n");
  // 年号と、10以下の整数（「2つの方式」など）は照合しない
  const { unmatched } = checkNumbers(text, allowed, { ignore: (n) => ignoreYears(n) || (Number.isInteger(n.value) && Math.abs(n.value) <= 10) });
  return { explanation: { ...e, picks }, unknownIds, unmatchedNumbers: unmatched.map((n) => n.raw) };
}
