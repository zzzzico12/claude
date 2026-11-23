// 軌道要素（GP データ）の取り寄せ。CelesTrak に負荷をかけないための仕組みはすべてここに集める
// - 保存先（Upstash Redis）に最後に取ったものを置き、2時間たつまでは CelesTrak に問い合わせない
// - 2時間たっていたら、1人だけが取りに行く（10分間の目印を付ける）。ほかの人には古いものを返す
// - 取得に失敗したら（403 など）、古いものを返し続け、10分は再挑戦しない
// - 保存先がない手元の開発では、CelesTrak には問い合わせず、data/celestrak/ に保存した一覧を使う
import { compactGp, fetchGroup, type CompactGp } from "@advent/orbit";
import { getStore, isPersistentStore } from "@advent/store";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const UA = "advent-2026-satellite-tracker (https://github.com/zzzzico12/claude)";
const KEY = "satellite-tracker-3d:gp:active";
const LOCK = "satellite-tracker-3d:gp:lock";
export const REFRESH_SEC = 2 * 60 * 60;
const KEEP_SEC = 3 * 24 * 60 * 60;
const LOCK_SEC = 10 * 60;

function localFile(): CompactGp | null {
  const dir = join(process.cwd(), "data", "celestrak");
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).filter((x) => /^active-.*\.json$/.test(x)).sort().at(-1);
  if (!f) return null;
  const path = join(dir, f);
  return compactGp(JSON.parse(readFileSync(path, "utf8")), `CelesTrak（手元に保存した ${f}）`, statSync(path).mtime.toISOString());
}

export async function getGp(): Promise<{ gp: CompactGp; stale: boolean } | null> {
  if (!isPersistentStore()) {
    const gp = localFile();
    return gp && { gp, stale: false };
  }
  const store = getStore();
  const raw = await store.get(KEY);
  const cached = raw ? (JSON.parse(raw) as CompactGp) : null;
  const age = cached ? (Date.now() - Date.parse(cached.fetchedAt)) / 1000 : Infinity;
  if (cached && age < REFRESH_SEC) return { gp: cached, stale: false };

  // 取りに行くのは1人だけ
  const n = await store.incr(LOCK, LOCK_SEC);
  if (n !== 1) return cached && { gp: cached, stale: true };
  try {
    const list = await fetchGroup("active", UA);
    const gp = compactGp(list, "CelesTrak GP（GROUP=active）");
    await store.set(KEY, JSON.stringify(gp), KEEP_SEC);
    return { gp, stale: false };
  } catch (err) {
    console.error(err);
    return cached && { gp: cached, stale: true };
  }
}
