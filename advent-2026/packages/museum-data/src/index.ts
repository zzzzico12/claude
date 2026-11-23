// 美術館の作品データを同じ形にそろえる。パブリックドメインの作品だけを扱う。
// - シカゴ美術館（Art Institute of Chicago, AIC）：API と IIIF の画像。データは CC0
// - メトロポリタン美術館（Met）：API のデータは CC0。ただし画像サーバー（images.metmuseum.org）は
//   プログラムからの取得をボット確認で止めているので、画像は取らない（2026-11-23 確認）

export const USER_AGENT = "advent-2026-open-data-ai (https://github.com/zzzzico12/claude)";

export interface Artwork {
  source: "aic" | "met";
  id: string;
  title: string;
  artist: string | null;
  date: string | null;
  /** 制作年（範囲なら始まり）。並べ替えや表示用 */
  year: number | null;
  medium: string | null;
  /** 実寸（cm）。分かる場合だけ（Day19 の実物大表示で使う） */
  dimensionsCm: { width: number; height: number } | null;
  /** 画像の URL を作る（幅 px を指定）。画像を取れない作品は null */
  imageUrl: ((width: number) => string) | null;
  pageUrl: string;
  isPublicDomain: boolean;
  license: string;
  credit: string;
}

const headers = { "User-Agent": USER_AGENT, "AIC-User-Agent": USER_AGENT };

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return (await res.json()) as T;
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    throw new Error(`${new URL(url).host} が HTTP ${res.status} を返しました`);
  }
}

// ---------- シカゴ美術館 ----------

const AIC_FIELDS = [
  "id",
  "title",
  "artist_title",
  "artist_display",
  "date_display",
  "date_start",
  "medium_display",
  "dimensions_detail",
  "image_id",
  "is_public_domain",
  "credit_line",
].join(",");

interface AicRaw {
  id: number;
  title: string;
  artist_title: string | null;
  artist_display: string | null;
  date_display: string | null;
  date_start: number | null;
  medium_display: string | null;
  dimensions_detail?: { width_cm?: number | null; height_cm?: number | null; clarification?: string | null }[] | null;
  image_id: string | null;
  is_public_domain: boolean;
  credit_line: string | null;
}

function fromAic(r: AicRaw): Artwork {
  const d = r.dimensions_detail?.find((x) => x.width_cm && x.height_cm);
  return {
    source: "aic",
    id: String(r.id),
    title: r.title,
    artist: r.artist_title,
    date: r.date_display,
    year: r.date_start,
    medium: r.medium_display,
    dimensionsCm: d ? { width: d.width_cm!, height: d.height_cm! } : null,
    // IIIF の画像。幅だけ指定すると縦横比を保って縮小される
    imageUrl: r.image_id ? (w: number) => `https://www.artic.edu/iiif/2/${r.image_id}/full/${w},/0/default.jpg` : null,
    pageUrl: `https://www.artic.edu/artworks/${r.id}`,
    isPublicDomain: r.is_public_domain,
    license: r.is_public_domain ? "CC0（パブリックドメイン）" : "パブリックドメインではない",
    credit: `The Art Institute of Chicago${r.credit_line ? `, ${r.credit_line}` : ""}`,
  };
}

export async function getAicArtwork(id: number | string): Promise<Artwork> {
  const d = await getJson<{ data: AicRaw }>(`https://api.artic.edu/api/v1/artworks/${id}?fields=${AIC_FIELDS}`);
  return fromAic(d.data);
}

/** キーワードで探す（パブリックドメインで画像のあるものだけ） */
export async function searchAic(q: string, limit = 10): Promise<Artwork[]> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    fields: AIC_FIELDS,
    "query[term][is_public_domain]": "true",
  });
  const d = await getJson<{ data: AicRaw[] }>(`https://api.artic.edu/api/v1/artworks/search?${params}`);
  return d.data.filter((r) => r.image_id).map(fromAic);
}

// ---------- メトロポリタン美術館（データだけ） ----------

interface MetRaw {
  objectID: number;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  objectBeginDate: number;
  medium: string;
  isPublicDomain: boolean;
  objectURL: string;
  creditLine: string;
}

export async function getMetObject(id: number | string): Promise<Artwork> {
  const r = await getJson<MetRaw>(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
  return {
    source: "met",
    id: String(r.objectID),
    title: r.title,
    artist: r.artistDisplayName || null,
    date: r.objectDate || null,
    year: r.objectBeginDate ?? null,
    medium: r.medium || null,
    dimensionsCm: null,
    imageUrl: null,
    pageUrl: r.objectURL,
    isPublicDomain: r.isPublicDomain,
    license: r.isPublicDomain ? "CC0（パブリックドメイン）" : "パブリックドメインではない",
    credit: `The Metropolitan Museum of Art${r.creditLine ? `, ${r.creditLine}` : ""}`,
  };
}

/** 画像を取得する（美術館の案内どおり、アプリ名を名乗って取る） */
export async function fetchImage(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) throw new Error(`画像を取得できませんでした（HTTP ${res.status}、${type}）`);
  return new Uint8Array(await res.arrayBuffer());
}
