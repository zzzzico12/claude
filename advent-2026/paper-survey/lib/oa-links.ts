// 無料で読めるリンクを探す。
// 1. arXiv にあれば arXiv（いちばん安定している）
// 2. OpenAlex の oa_url
// 3. Unpaywall（Crossref の DOI だけが対象。arXiv の DOI は 404 になる）
// Unpaywall にはメールアドレス（CONTACT_EMAIL）を付ける必要がある。サーバー側だけで使い、ログに URL を出さない。
import type { Paper } from "./openalex.js";

export interface OaLink {
  url: string | null;
  source: "arxiv" | "openalex" | "unpaywall" | null;
}

async function unpaywall(doi: string): Promise<string | null> {
  const email = process.env.CONTACT_EMAIL;
  if (!email) return null;
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?${new URLSearchParams({ email })}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { best_oa_location?: { url_for_pdf?: string; url?: string } | null };
    return data.best_oa_location?.url_for_pdf ?? data.best_oa_location?.url ?? null;
  } catch {
    return null;
  }
}

export async function findOaLink(p: Pick<Paper, "arxivId" | "oaUrl" | "doi">): Promise<OaLink> {
  if (p.arxivId) return { url: `https://arxiv.org/abs/${p.arxivId}`, source: "arxiv" };
  if (p.oaUrl) return { url: p.oaUrl, source: "openalex" };
  if (p.doi && !p.doi.toLowerCase().startsWith("10.48550/")) {
    const url = await unpaywall(p.doi);
    if (url) return { url, source: "unpaywall" };
  }
  return { url: null, source: null };
}

/** 同時に投げる数を抑えて、まとめて探す（Unpaywall に負荷をかけない） */
export async function findOaLinks<T extends Pick<Paper, "arxivId" | "oaUrl" | "doi">>(
  papers: T[],
  concurrency = 4,
): Promise<OaLink[]> {
  const out: OaLink[] = new Array(papers.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < papers.length) {
        const i = next++;
        out[i] = await findOaLink(papers[i]);
      }
    }),
  );
  return out;
}
