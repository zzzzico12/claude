// 提案：条件（遅延・クラウド・置ける国）を満たすリージョンを、CO2 が少ない順に並べる。すべてコードで計算する。
import { estimateCarbon, type CarbonEstimate } from "./carbon.js";
import { distanceKm, estimateRtt, type RttEstimate } from "./latency.js";
import { REGIONS, type Provider, type Region } from "./regions.js";

export const REQUIREMENTS = {
  realtime: { label: "リアルタイム（ゲーム・通話など）", maxRttMs: 50 },
  web: { label: "Web アプリ・API", maxRttMs: 150 },
  batch: { label: "バッチ処理・学習（遅延は気にしない）", maxRttMs: null },
} as const;
export type Requirement = keyof typeof REQUIREMENTS;

export interface Query {
  lat: number;
  lon: number;
  requirement: Requirement;
  providers: Provider[];
  /** データを置ける国（ISO3）。null ならどこでも */
  countries: string[] | null;
}

export interface Candidate {
  region: Region;
  carbon: CarbonEstimate;
  km: number;
  rttMs: number;
  rttMethod: RttEstimate["method"];
}

export interface Recommendation {
  query: Query;
  /** 条件を満たすもの（CO2 の少ない順） */
  ranked: Candidate[];
  /** 比べる基準：条件を満たすもののうち、いちばん近いリージョン */
  nearest: Candidate | null;
  /** 1位を選んだときの、いちばん近いリージョンと比べた CO2 の削減率（0〜1）と遅延の増え方 */
  savings: { ratio: number; extraMs: number } | null;
  excluded: { latency: number; country: number };
}

export function allCandidates(q: Pick<Query, "lat" | "lon" | "providers">): Candidate[] {
  return REGIONS.filter((r) => r.public !== false && q.providers.includes(r.provider)).flatMap((region) => {
    const carbon = estimateCarbon(region);
    if (!carbon) return [];
    const rtt = estimateRtt(q, region);
    return [{ region, carbon, km: Math.round(distanceKm(q, region)), rttMs: rtt.ms, rttMethod: rtt.method }];
  });
}

export function recommend(q: Query): Recommendation {
  const all = allCandidates(q);
  const max = REQUIREMENTS[q.requirement].maxRttMs;
  const inCountry = all.filter((c) => !q.countries || q.countries.includes(c.region.iso3));
  const ok = inCountry.filter((c) => max === null || c.rttMs <= max);
  // CO2 が同じなら近いほうを上に
  const ranked = [...ok].sort((a, b) => a.carbon.g - b.carbon.g || a.km - b.km);
  const nearest = [...ok].sort((a, b) => a.km - b.km)[0] ?? null;
  const best = ranked[0];
  const savings =
    best && nearest && nearest.carbon.g > 0
      ? { ratio: 1 - best.carbon.g / nearest.carbon.g, extraMs: best.rttMs - nearest.rttMs }
      : null;
  return {
    query: q,
    ranked,
    nearest,
    savings,
    excluded: { latency: inCountry.length - ok.length, country: all.length - inCountry.length },
  };
}
