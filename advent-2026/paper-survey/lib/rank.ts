// 候補の論文をまとめて、点数で並べ直す。AI は使わず、すべてコードで計算する。
import type { Paper } from "./openalex.js";

/** タイトルを比べやすい形にする（arXiv版と学会版の重複をまとめるため） */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface RankedPaper extends Paper {
  /** 点数の内訳（画面と記事で「なぜこの順番か」を見せる） */
  score: { total: number; relevance: number; citations: number; recency: number };
  /** どの検索語で見つかったか */
  foundBy: string[];
}

/**
 * 複数の検索語の結果をまとめる。
 * 同じ論文（タイトルが同じ）は1件にし、引用数は多いほう・関連度は高いほうを使う。
 */
export function mergeResults(results: { query: string; papers: Paper[] }[]): (Paper & { foundBy: string[]; bestRank: number })[] {
  const byTitle = new Map<string, Paper & { foundBy: string[]; bestRank: number }>();
  for (const { query, papers } of results) {
    papers.forEach((p, rank) => {
      const key = normalizeTitle(p.title);
      const prev = byTitle.get(key);
      if (!prev) {
        byTitle.set(key, { ...p, foundBy: [query], bestRank: rank });
        return;
      }
      const keep = p.citedBy > prev.citedBy ? { ...p } : { ...prev };
      byTitle.set(key, {
        ...keep,
        oaUrl: keep.oaUrl ?? prev.oaUrl ?? p.oaUrl,
        arxivId: keep.arxivId ?? prev.arxivId ?? p.arxivId,
        doi: keep.doi ?? prev.doi ?? p.doi,
        relevance: Math.max(prev.relevance, p.relevance),
        foundBy: [...new Set([...prev.foundBy, query])],
        bestRank: Math.min(prev.bestRank, rank),
      });
    });
  }
  return [...byTitle.values()];
}

export interface RankWeights {
  relevance: number;
  citations: number;
  recency: number;
}

export const DEFAULT_WEIGHTS: RankWeights = { relevance: 1, citations: 1, recency: 0.3 };

/**
 * 点数 = 関連度 + 1年あたりの引用数（対数）+ 新しさ。それぞれ 0〜1 にそろえてから重みを掛ける。
 * - 関連度：検索での順位（上位ほど高い）。複数の検索語で見つかった論文は少し上げる
 * - 引用数：古い論文ほど引用が多くなるので、出てからの年数で割る
 * - 新しさ：期間の中で新しいほど高い
 */
export function rankPapers(
  candidates: (Paper & { foundBy: string[]; bestRank: number })[],
  { now = new Date(), weights = DEFAULT_WEIGHTS }: { now?: Date; weights?: RankWeights } = {},
): RankedPaper[] {
  if (candidates.length === 0) return [];
  const thisYear = now.getUTCFullYear();
  const maxRank = Math.max(...candidates.map((c) => c.bestRank)) + 1;
  const perYear = candidates.map((c) => Math.log1p(c.citedBy / Math.max(1, thisYear - c.year + 1)));
  const maxPerYear = Math.max(...perYear, 1e-9);
  const minYear = Math.min(...candidates.map((c) => c.year));
  const yearSpan = Math.max(1, thisYear - minYear);

  return candidates
    .map((c, i) => {
      const relevance = Math.min(1, 1 - c.bestRank / maxRank + 0.1 * (c.foundBy.length - 1));
      const citations = perYear[i] / maxPerYear;
      const recency = (c.year - minYear) / yearSpan;
      const total =
        weights.relevance * relevance + weights.citations * citations + weights.recency * recency;
      const round = (x: number) => Math.round(x * 1000) / 1000;
      return {
        ...c,
        score: { total: round(total), relevance: round(relevance), citations: round(citations), recency: round(recency) },
      };
    })
    .sort((a, b) => b.score.total - a.score.total);
}

/** 比較用：引用数の多い順に並べるだけ */
export function rankByCitations<T extends Paper>(papers: T[]): T[] {
  return [...papers].sort((a, b) => b.citedBy - a.citedBy);
}
