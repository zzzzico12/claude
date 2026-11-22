import { describe, expect, it } from "vitest";
import { reconstructAbstract, toPaper, type Paper } from "./openalex.js";
import { mergeResults, normalizeTitle, rankPapers, type RankedPaper } from "./rank.js";
import { checkSurvey, citedNumbers } from "./survey.js";

const paper = (over: Partial<Paper>): Paper => ({
  id: "W1",
  title: "A",
  year: 2020,
  publicationDate: "2020-01-01",
  citedBy: 0,
  doi: null,
  arxivId: null,
  oaUrl: null,
  abstract: "x".repeat(300),
  relevance: 0,
  venue: null,
  firstAuthor: null,
  ...over,
});

describe("OpenAlex のデータの読み方", () => {
  it("単語の位置の形式から抄録を戻す", () => {
    expect(reconstructAbstract({ world: [1], hello: [0], again: [2] })).toBe("hello world again");
  });
  it("arXiv の番号から年を出し、雑誌版の年より早ければそちらを使う", () => {
    const p = toPaper({
      id: "https://openalex.org/W9",
      title: "Corrective RAG",
      publication_year: 2026,
      publication_date: "2026-03-01",
      cited_by_count: 10,
      doi: "https://doi.org/10.48550/arxiv.2401.15884",
    });
    expect(p.arxivId).toBe("2401.15884");
    expect(p.year).toBe(2024);
  });
});

describe("重複をまとめる", () => {
  it("タイトルが同じなら1件にし、引用数の多いほうと、すべての検索語を残す", () => {
    const merged = mergeResults([
      { query: "q1", papers: [paper({ id: "W1", title: "Retrieval-Augmented Generation", citedBy: 10 })] },
      { query: "q2", papers: [paper({ id: "W2", title: "retrieval augmented generation.", citedBy: 99, arxivId: "2005.11401" })] },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: "W2", citedBy: 99, foundBy: ["q1", "q2"], bestRank: 0 });
    expect(normalizeTitle("Retrieval-Augmented <i>Generation</i>")).toBe("retrieval augmented generation");
  });
});

describe("並べ替え", () => {
  it("引用数が多くても、関連度が低すぎる論文は上に来ない", () => {
    const now = new Date("2026-11-22");
    const candidates = [
      { ...paper({ id: "relevant", year: 2023, citedBy: 2000 }), foundBy: ["q1", "q2"], bestRank: 0 },
      { ...paper({ id: "famous", year: 2020, citedBy: 60000 }), foundBy: ["q1"], bestRank: 99 },
      ...Array.from({ length: 98 }, (_, i) => ({ ...paper({ id: `p${i}`, year: 2022, citedBy: 50 }), foundBy: ["q1"], bestRank: i + 1 })),
    ];
    const ranked = rankPapers(candidates, { now });
    expect(ranked[0].id).toBe("relevant");
    expect(ranked.findIndex((p) => p.id === "famous")).toBeGreaterThan(0);
  });
});

describe("サーベイの照合", () => {
  const papers = [
    paper({ title: "Paper one", year: 2021, citedBy: 120, abstract: `We train on 45 million documents. ${"x".repeat(300)}` }),
    paper({ title: "Paper two", year: 2023, citedBy: 8 }),
  ] as RankedPaper[];

  it("根拠の番号を読む（[2, 5] や全角の読点も）", () => {
    expect(citedNumbers("a [1] b [2, 5] c [3、4]")).toEqual([1, 2, 5, 3, 4]);
  });
  it("リストにない番号・使われなかった論文・元データにない数字を見つける", () => {
    const c = checkSurvey("4,500万件の文書で学習した [1]。精度は87.5%だった [3]。", papers);
    expect(c.invalidCitations).toEqual([3]);
    expect(c.uncitedPapers).toEqual([2]);
    expect(c.unmatchedNumbers).toEqual(["87.5%"]);
  });
  it("小さな数（「3つの流れ」）と年号は照合しない", () => {
    expect(checkSurvey("3つの流れがある。2021年の研究 [1] と [2]。", papers).unmatchedNumbers).toEqual([]);
  });
});
