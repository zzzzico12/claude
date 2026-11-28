// NASA JPL の接近天体データ（SBDB Close-Approach Data API）と、衝突リスクの一覧（Sentry）
// https://ssd-api.jpl.nasa.gov/doc/cad.html ・ https://ssd-api.jpl.nasa.gov/doc/sentry.html （キー不要。2026-11-28 に確認）
import type { Approach } from "./compare.js";
import { UA } from "./objects.js";

export const CAD_API = "https://ssd-api.jpl.nasa.gov/cad.api";
export const SENTRY_API = "https://ssd-api.jpl.nasa.gov/sentry.api";
/** 今日から30日、0.2 au（月までの距離の約80倍）以内 */
export const DAYS = 30;
export const DIST_MAX_AU = 0.2;

const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

/** JPL の日時（2026-Dec-03 11:08、UTC）→ ISO 8601 */
export function cdToIso(cd: string): string {
  const m = cd.match(/^(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) throw new Error(`日時が読めません：${cd}`);
  return `${m[1]}-${MONTHS[m[2]]}-${m[3]}T${m[4]}:${m[5]}:00Z`;
}

export function parseCad(j: { fields: string[]; data: (string | null)[][] }): Approach[] {
  const i = (k: string) => j.fields.indexOf(k);
  const num = (v: string | null) => (v == null || v === "" ? null : Number(v));
  return j.data.map((r) => ({
    des: r[i("des")]!,
    fullname: (r[i("fullname")] ?? r[i("des")]!).trim(),
    time: cdToIso(r[i("cd")]!),
    timeSigma: r[i("t_sigma_f")] ?? "",
    dist: Number(r[i("dist")]),
    distMin: Number(r[i("dist_min")]),
    distMax: Number(r[i("dist_max")]),
    vRel: Number(r[i("v_rel")]),
    h: num(r[i("h")]),
    diameter: num(r[i("diameter")]),
    diameterSigma: num(r[i("diameter_sigma")]),
  }));
}

export async function fetchApproaches(opts: { dateMin?: string; dateMax?: string; distMax?: number } = {}): Promise<Approach[]> {
  const q = new URLSearchParams({
    "date-min": opts.dateMin ?? "now",
    "date-max": opts.dateMax ?? `+${DAYS}`,
    "dist-max": String(opts.distMax ?? DIST_MAX_AU),
    body: "Earth",
    diameter: "true",
    fullname: "true",
  });
  const res = await fetch(`${CAD_API}?${q}`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`JPL が HTTP ${res.status} を返しました`);
  const j = await res.json();
  return j.count ? parseCad(j) : [];
}

export interface SentryEntry {
  des: string;
  /** これから100年で地球に衝突する確率（合計） */
  ip: number;
  /** トリノ・スケール（0〜10。0 は「衝突の心配はほぼない」） */
  ts: number;
  /** 衝突の可能性がある年の範囲 */
  range: string;
}

/** Sentry に載っている天体（衝突の可能性がゼロではないと計算されたもの）の一覧 */
export async function fetchSentry(): Promise<Map<string, SentryEntry>> {
  const res = await fetch(SENTRY_API, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`JPL Sentry が HTTP ${res.status} を返しました`);
  const j = (await res.json()) as { data: { des: string; ip: string; ts_max: string | null; range: string }[] };
  return new Map(j.data.map((d) => [d.des, { des: d.des, ip: Number(d.ip), ts: Number(d.ts_max ?? 0), range: d.range }]));
}
