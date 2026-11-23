// CISA KEV（Known Exploited Vulnerabilities）：実際に悪用が確認された脆弱性の一覧。米国政府の公開データ。
import { fetchJson } from "./http.js";

export const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export interface KevEntry {
  cveID: string;
  dateAdded: string;
  knownRansomwareCampaignUse: string;
  vendorProject: string;
  product: string;
}

export interface KevCatalog {
  catalogVersion: string;
  vulnerabilities: KevEntry[];
}

export async function loadKev(): Promise<{ version: string; byCve: Map<string, KevEntry> }> {
  const data = await fetchJson<KevCatalog>(KEV_URL);
  if (!data) throw new Error("CISA KEV を取得できませんでした");
  return { version: data.catalogVersion, byCve: new Map(data.vulnerabilities.map((v) => [v.cveID, v])) };
}
