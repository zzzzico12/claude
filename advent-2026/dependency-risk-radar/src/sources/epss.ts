// EPSS（Exploit Prediction Scoring System、FIRST）：CVE が30日以内に悪用される確率。
import { fetchJson } from "./http.js";

export interface EpssScore {
  probability: number;
  percentile: number;
  date: string;
}

export async function loadEpss(cves: string[]): Promise<Map<string, EpssScore>> {
  const out = new Map<string, EpssScore>();
  const unique = [...new Set(cves)];
  // URL が長くなりすぎないよう50件ずつ
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const res = await fetchJson<{ data: { cve: string; epss: string; percentile: string; date: string }[] }>(
      `https://api.first.org/data/v1/epss?cve=${chunk.join(",")}`,
    );
    for (const d of res?.data ?? []) {
      out.set(d.cve, { probability: Number(d.epss), percentile: Number(d.percentile), date: d.date });
    }
  }
  return out;
}
