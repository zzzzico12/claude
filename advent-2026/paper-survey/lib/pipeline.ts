// 論文を探して並べるまで（Claude は検索語づくりだけ）。画面の API と評価スクリプトの両方から使う。
import { mergeResults, rankPapers, type RankedPaper } from "./rank.js";
import { searchWorks, type SearchOptions } from "./openalex.js";
import { makeQueries } from "./survey.js";

export interface FindResult {
  englishTheme: string;
  queries: string[];
  candidateCount: number;
  /** 並べ替えた全候補（評価で上位100本などを見る） */
  ranked: RankedPaper[];
}

export async function findPapers(
  theme: string,
  opts: SearchOptions & { queries?: string[] } = {},
): Promise<FindResult> {
  const q = opts.queries ? { english_theme: theme, queries: opts.queries } : await makeQueries(theme);
  const results = [];
  // OpenAlex に負荷をかけないよう、検索語は順番に投げる
  for (const query of q.queries) results.push({ query, papers: await searchWorks(query, opts) });
  const merged = mergeResults(results);
  return {
    englishTheme: q.english_theme,
    queries: q.queries,
    candidateCount: merged.length,
    ranked: rankPapers(merged),
  };
}
