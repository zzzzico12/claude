import type { Source } from "@advent/attribution";

// 出典は画面と README の両方にここから出す
export const sources: Source[] = [
  {
    name: "OpenAlex（論文・引用・抄録・参考文献）",
    provider: "OurResearch",
    url: "https://openalex.org/",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    retrievedAt: "検索のたびに取得",
  },
  {
    name: "Unpaywall（無料で読めるリンク）",
    provider: "OurResearch",
    url: "https://unpaywall.org/",
    license: "利用条件は公式サイトを参照（要確認）",
    retrievedAt: "検索のたびに取得",
  },
  {
    name: "arXiv（プレプリントへのリンク）",
    provider: "Cornell University",
    url: "https://arxiv.org/",
    license: "リンクのみ（各論文のライセンスは論文ごとに異なる）",
    retrievedAt: "検索のたびに取得",
    credit: "Thank you to arXiv for use of its open access interoperability.",
  },
];
