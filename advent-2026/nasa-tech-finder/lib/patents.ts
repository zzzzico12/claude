// NASA 技術移転（T2 ポータル）の特許を集める
// 全件を返す窓口はないので、分野名と一般的な語で検索して集め、重複を除く。
// 検索の結果は `?page=1` を付けると1回で全部返る（2026-11-26 に確認）
export const UA = "advent-2026-nasa-tech-finder (https://github.com/zzzzico12/claude)";
export const T2_API = "https://technology.nasa.gov/api/api/patent/";

export interface Patent {
  /** 例：LEW-TOPS-168（T2 ポータルの ID。ページの URL にも使う） */
  id: string;
  title: string;
  description: string;
  category: string;
  /** 開発した NASA のセンター（GRC・JSC など） */
  center: string;
  url: string;
}

/** 検索に使う語：T2 ポータルの15分野と、どの分野にも出てくる一般的な語 */
export const SWEEP_WORDS = [
  "aerospace", "communications", "electrical", "environment", "health", "software", "instrumentation", "manufacturing",
  "materials", "mechanical", "optics", "power", "propulsion", "robotics", "sensors",
  "system", "method", "device", "apparatus", "process", "material", "sensor", "composite", "coating", "detector",
  "antenna", "battery", "laser", "optical", "fluid", "thermal", "structure", "engine", "signal", "data", "imaging",
  "medical", "water", "air", "energy", "control", "measurement", "temperature", "pressure", "light", "radiation",
  "wireless", "alloy", "polymer", "space", "aircraft", "high", "low", "nasa",
];

const strip = (s: unknown) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** T2 の検索結果の1行（配列）を Patent にする。並びは [?, ID, 題名, 説明, ID, 分野, , , , センター, 画像, , 点数] */
export function toPatent(r: unknown[]): Patent | null {
  const id = strip(r[1]);
  const title = strip(r[2]);
  const description = strip(r[3]);
  if (!id || !title || !description) return null;
  const category = strip(r[5]);
  return {
    id,
    title,
    description,
    // 大文字・小文字の違いだけの分野名（"aerospace" と "Aerospace"）をそろえる
    category: category.replace(/\b\w/g, (c) => c.toUpperCase()),
    center: strip(r[9]),
    url: `https://technology.nasa.gov/patent/${encodeURIComponent(id)}`,
  };
}

export async function searchT2(word: string): Promise<Patent[]> {
  const res = await fetch(`${T2_API}${encodeURIComponent(word)}?page=1`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`T2 が HTTP ${res.status} を返しました（${word}）`);
  const j = (await res.json()) as { results: unknown[][] };
  return j.results.map(toPatent).filter((x): x is Patent => x !== null);
}

/** 語を順に検索して重複を除く。間隔をあけて、NASA のサーバーに負荷をかけない */
export async function collectPatents(log: (s: string) => void = () => {}, gapMs = 1500): Promise<Patent[]> {
  const all = new Map<string, Patent>();
  for (const w of SWEEP_WORDS) {
    const before = all.size;
    for (const p of await searchT2(w)) if (!all.has(p.id)) all.set(p.id, p);
    log(`${w.padEnd(16)} +${all.size - before}（計 ${all.size}）`);
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return [...all.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** ベクトルにする文（題名＋分野＋説明の先頭600字。無料の制限の中で送れるように短くする） */
export const patentText = (p: Patent) => `${p.title}\nCategory: ${p.category}\n${p.description.slice(0, 600)}`;
