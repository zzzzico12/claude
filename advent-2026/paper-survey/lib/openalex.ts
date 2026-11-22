// OpenAlex（https://openalex.org/）から論文を探す。データは CC0。
// API キーは OPENALEX_API_KEY（サーバー側だけで使う）。

const BASE = "https://api.openalex.org";

export interface Paper {
  /** OpenAlex の ID（例: "W4389984066"） */
  id: string;
  title: string;
  year: number;
  publicationDate: string;
  citedBy: number;
  doi: string | null;
  arxivId: string | null;
  /** OpenAlex が知っている無料で読めるリンク */
  oaUrl: string | null;
  abstract: string;
  /** 検索での関連度（OpenAlex の relevance_score） */
  relevance: number;
  venue: string | null;
  firstAuthor: string | null;
}

interface RawWork {
  id: string;
  title: string | null;
  publication_year: number;
  publication_date: string;
  cited_by_count: number;
  doi: string | null;
  ids?: Record<string, string>;
  open_access?: { oa_url: string | null };
  abstract_inverted_index?: Record<string, number[]> | null;
  relevance_score?: number;
  primary_location?: { source?: { display_name?: string } | null; landing_page_url?: string | null } | null;
  locations?: { landing_page_url?: string | null; pdf_url?: string | null }[];
  authorships?: { author: { display_name: string } }[];
}

const SELECT = [
  "id",
  "title",
  "publication_year",
  "publication_date",
  "cited_by_count",
  "doi",
  "ids",
  "open_access",
  "abstract_inverted_index",
  "relevance_score",
  "primary_location",
  "locations",
  "authorships",
].join(",");

/** 抄録は「単語 → 出てくる位置」の形なので、位置の順に並べ直して文章に戻す */
export function reconstructAbstract(index: Record<string, number[]> | null | undefined): string {
  if (!index) return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word;
  return words.filter(Boolean).join(" ");
}

const ARXIV_RE = /arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})/i;

function findArxivId(w: RawWork): string | null {
  const doi = w.doi ?? "";
  const m = doi.match(/10\.48550\/arxiv\.([0-9]{4}\.[0-9]{4,5})/i);
  if (m) return m[1];
  for (const loc of w.locations ?? []) {
    const hit = (loc.landing_page_url ?? loc.pdf_url ?? "").match(ARXIV_RE);
    if (hit) return hit[1];
  }
  return null;
}

/** 抄録がこれより短いものは、著者名や書誌情報だけのことが多いので候補から外す */
export const MIN_ABSTRACT_CHARS = 300;

export function toPaper(w: RawWork): Paper {
  const arxivId = findArxivId(w);
  // arXiv の番号は yymm で始まる（2401.15884 = 2024年1月）。OpenAlex の年は後から出た雑誌版の年のことがあるので、早いほうを使う
  const arxivYear = arxivId ? 2000 + Number(arxivId.slice(0, 2)) : Infinity;
  return {
    id: w.id.replace("https://openalex.org/", ""),
    title: (w.title ?? "").trim(),
    year: Math.min(w.publication_year, arxivYear),
    publicationDate: w.publication_date,
    citedBy: w.cited_by_count,
    doi: w.doi ? w.doi.replace("https://doi.org/", "") : null,
    arxivId,
    oaUrl: w.open_access?.oa_url ?? null,
    abstract: reconstructAbstract(w.abstract_inverted_index),
    relevance: w.relevance_score ?? 0,
    venue: w.primary_location?.source?.display_name ?? null,
    firstAuthor: w.authorships?.[0]?.author.display_name ?? null,
  };
}

async function get(path: string, params: Record<string, string>): Promise<any> {
  const key = process.env.OPENALEX_API_KEY;
  if (!key) throw new Error("OPENALEX_API_KEY が設定されていません");
  const url = `${BASE}${path}?${new URLSearchParams({ ...params, api_key: key })}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    // 混んでいるときは少し待って2回までやり直す
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    // URL にはキーが入るので、エラーには path だけを出す
    throw new Error(`OpenAlex ${path} が HTTP ${res.status} を返しました`);
  }
}

export interface SearchOptions {
  fromYear?: number;
  /** この日より前（この日を含まない）に公開された論文だけ。評価で使う */
  beforeDate?: string;
  perPage?: number;
}

/** 関連度順で検索する。抄録のない論文は除く */
export async function searchWorks(query: string, opts: SearchOptions = {}): Promise<Paper[]> {
  const filter = ["has_abstract:true", "type:article|preprint|conference-paper|review"];
  if (opts.fromYear) filter.push(`from_publication_date:${opts.fromYear}-01-01`);
  if (opts.beforeDate) {
    const d = new Date(opts.beforeDate);
    d.setUTCDate(d.getUTCDate() - 1);
    filter.push(`to_publication_date:${d.toISOString().slice(0, 10)}`);
  }
  const data = await get("/works", {
    search: query,
    filter: filter.join(","),
    per_page: String(opts.perPage ?? 100),
    select: SELECT,
  });
  return (data.results as RawWork[]).map(toPaper).filter((p) => p.title && p.abstract.length >= MIN_ABSTRACT_CHARS);
}

/** ID の一覧から論文を取る（100件ずつ） */
export async function getWorks(ids: string[], select = "id,title"): Promise<RawWork[]> {
  const out: RawWork[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100).map((id) => id.replace("https://openalex.org/", ""));
    const data = await get("/works", { filter: `openalex_id:${chunk.join("|")}`, per_page: "100", select });
    out.push(...data.results);
  }
  return out;
}

export async function getWork(id: string, select: string): Promise<any> {
  return get(`/works/${id}`, { select });
}
