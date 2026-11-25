// 軌道要素（GP データ）の取り寄せ。CelesTrak に負荷をかけないための仕組みはここに集める（Day06 と同じ作り）
// - 取るのは小さな分類 2 つ：stations（ISS・天宮など）と visual（明るい衛星 約150機）
// - 保存先（Upstash Redis）に最後に取ったものを置き、2時間たつまでは CelesTrak に問い合わせない
// - 2時間たっていたら、1人だけが取りに行く（10分間の目印）。ほかの人と、取得に失敗したときは古いものを返す
// - 保存先がない手元の開発では、data/celestrak/ に保存したものを使い、なければ1回だけ取って保存する
import { compactGp, expandGp, fetchGroup, type CompactGp, type Gp } from "@advent/orbit";
import { getStore, isPersistentStore } from "@advent/store";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const UA = "advent-2026-satellite-pass-api (https://github.com/zzzzico12/claude)";
export const GROUPS = ["stations", "visual"] as const;
const KEY = "satellite-pass-api:gp";
const LOCK = "satellite-pass-api:gp:lock";
const REFRESH_SEC = 2 * 60 * 60;
const KEEP_SEC = 3 * 24 * 60 * 60;
const LOCK_SEC = 10 * 60;

/** 2つの分類をまとめる（同じ衛星が両方にあれば1つにする） */
function merge(lists: Record<string, unknown>[][]): Record<string, unknown>[] {
  const seen = new Set<unknown>();
  return lists.flat().filter((g) => !seen.has(g.NORAD_CAT_ID) && seen.add(g.NORAD_CAT_ID));
}

async function fetchAll(): Promise<Record<string, unknown>[]> {
  const lists: Record<string, unknown>[][] = [];
  for (const g of GROUPS) {
    lists.push(await fetchGroup(g, UA));
    await new Promise((r) => setTimeout(r, 1000));
  }
  return merge(lists);
}

async function local(): Promise<CompactGp> {
  const dir = join(process.cwd(), "data", "celestrak");
  const f = existsSync(dir) ? readdirSync(dir).filter((x) => /^gp-.*\.json$/.test(x)).sort().at(-1) : undefined;
  if (f) {
    const path = join(dir, f);
    return compactGp(JSON.parse(readFileSync(path, "utf8")), `CelesTrak（手元に保存した ${f}）`, statSync(path).mtime.toISOString());
  }
  const list = await fetchAll();
  mkdirSync(dir, { recursive: true });
  const name = `gp-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(join(dir, name), JSON.stringify(list));
  return compactGp(list, `CelesTrak（手元に保存した ${name}）`);
}

export async function getGp(): Promise<{ gp: CompactGp; stale: boolean } | null> {
  if (!isPersistentStore()) return { gp: await local(), stale: false };
  const store = getStore();
  const raw = await store.get(KEY);
  const cached = raw ? (JSON.parse(raw) as CompactGp) : null;
  const age = cached ? (Date.now() - Date.parse(cached.fetchedAt)) / 1000 : Infinity;
  if (cached && age < REFRESH_SEC) return { gp: cached, stale: false };

  const n = await store.incr(LOCK, LOCK_SEC);
  if (n !== 1) return cached && { gp: cached, stale: true };
  try {
    const gp = compactGp(await fetchAll(), `CelesTrak GP（GROUP=${GROUPS.join("・")}）`);
    await store.set(KEY, JSON.stringify(gp), KEEP_SEC);
    return { gp, stale: false };
  } catch (err) {
    console.error(err);
    return cached && { gp: cached, stale: true };
  }
}

/** よく聞かれる衛星（一覧の先頭に出す。名前の言い換えも受け付ける） */
export const FAMOUS: { norad: number; ja: string; en: string; aliases: string[] }[] = [
  { norad: 25544, ja: "国際宇宙ステーション（ISS）", en: "International Space Station (ISS)", aliases: ["iss", "国際宇宙ステーション", "宇宙ステーション", "zarya", "space station"] },
  { norad: 48274, ja: "中国の宇宙ステーション 天宮（天和）", en: "Tiangong (Chinese Space Station)", aliases: ["天宮", "天宫", "tiangong", "css", "tianhe", "天和", "中国の宇宙ステーション"] },
  { norad: 20580, ja: "ハッブル宇宙望遠鏡", en: "Hubble Space Telescope", aliases: ["hst", "hubble", "ハッブル", "ハッブル宇宙望遠鏡"] },
];

/** 名前・言い換え・NORAD 番号から衛星を探す */
export function findSatellite(gps: Gp[], query: string | number | null | undefined): Gp | undefined {
  if (query == null || query === "") return gps.find((g) => g.NORAD_CAT_ID === 25544);
  const n = Number(query);
  if (Number.isInteger(n) && n > 0) return gps.find((g) => g.NORAD_CAT_ID === n);
  const q = String(query).trim().toLowerCase();
  const famous = FAMOUS.find((f) => f.aliases.some((a) => q === a || q.includes(a)));
  if (famous) return gps.find((g) => g.NORAD_CAT_ID === famous.norad);
  return gps.find((g) => g.OBJECT_NAME.toLowerCase() === q) ?? gps.find((g) => g.OBJECT_NAME.toLowerCase().includes(q));
}

export { expandGp };
