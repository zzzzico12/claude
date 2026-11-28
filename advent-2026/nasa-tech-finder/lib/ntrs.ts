// NASA 技術報告書サーバー（NTRS）の検索。数十万件あるので事前には持たず、課題ごとにその場で検索する
// https://ntrs.nasa.gov/api/citations/search （キー不要。2026-11-26 に確認）
import { UA } from "./patents.js";

export const NTRS_API = "https://ntrs.nasa.gov/api/citations/search";

export interface Report {
  id: string;
  title: string;
  abstract: string;
  /** 発行年（不明なら null） */
  year: number | null;
  /** 種類（TECHNICAL_REPORT・CONFERENCE_PAPER など） */
  type: string;
  center: string;
  url: string;
  /** 要約を画面にそのまま出してよいか（NTRS の著作権の判定が「公共利用可」のときだけ） */
  abstractPublic: boolean;
}

interface Raw {
  id: number | string;
  title?: string;
  abstract?: string;
  distribution?: string;
  stiType?: string;
  center?: { code?: string };
  publications?: { publicationDate?: string }[];
  copyright?: { determinationType?: string };
}

export function toReport(r: Raw): Report | null {
  // 公開されていて、要約があるものだけ（要約で並べ直すので）
  if (r.distribution !== "PUBLIC" || !r.title || !r.abstract || r.abstract.length < 80) return null;
  const date = r.publications?.[0]?.publicationDate;
  return {
    id: String(r.id),
    title: r.title.trim(),
    abstract: r.abstract.replace(/\s+/g, " ").trim(),
    year: date ? Number(date.slice(0, 4)) || null : null,
    type: r.stiType ?? "OTHER",
    center: r.center?.code ?? "",
    url: `https://ntrs.nasa.gov/citations/${r.id}`,
    abstractPublic: r.copyright?.determinationType === "PUBLIC_USE_PERMITTED" || r.copyright?.determinationType === "GOV_PUBLIC_USE_PERMITTED",
  };
}

/** 1つの検索語で上位 size 件 */
export async function searchNtrs(q: string, size = 25): Promise<Report[]> {
  const url = `${NTRS_API}?q=${encodeURIComponent(q)}&page.size=${size}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`NTRS が HTTP ${res.status} を返しました`);
  const j = (await res.json()) as { results: Raw[] };
  return j.results.map(toReport).filter((x): x is Report => x !== null);
}

/** 1件を ID で取る（詳しい解説で使う）。本文の PDF があればその URL も */
export async function getReport(id: string): Promise<(Report & { pdfUrl: string | null }) | null> {
  if (!/^\d{5,20}$/.test(id)) return null;
  const res = await fetch(`https://ntrs.nasa.gov/api/citations/${id}`, { headers: { "User-Agent": UA } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`NTRS が HTTP ${res.status} を返しました`);
  const raw = (await res.json()) as Raw & { downloads?: { links?: { pdf?: string } }[] };
  const r = toReport(raw);
  if (!r) return null;
  const pdf = raw.downloads?.find((d) => d.links?.pdf)?.links?.pdf;
  return { ...r, pdfUrl: pdf ? `https://ntrs.nasa.gov${pdf}` : null };
}

/** いくつかの検索語で集めて重複を除く（同時に投げず、順に） */
export async function searchNtrsMany(queries: string[], size = 25): Promise<Report[]> {
  const all = new Map<string, Report>();
  for (const q of queries) {
    try {
      for (const r of await searchNtrs(q, size)) if (!all.has(r.id)) all.set(r.id, r);
    } catch (err) {
      console.error(err); // 1つの語で失敗しても、ほかの語の結果で続ける
    }
  }
  return [...all.values()];
}

/** ベクトルにする文（題名＋要約の先頭400字。検索のたびに送るので、無料の制限（1分に1万トークン）に収まるよう短くする） */
export const reportText = (r: Report) => `${r.title}\n${r.abstract.slice(0, 400)}`;
