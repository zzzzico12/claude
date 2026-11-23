import type { Source } from "@advent/attribution";
import { CARBON } from "./carbon-data.js";
import { AZURE_RTT_MEASURED_ON } from "./latency-data.js";

// 出典は画面と README の両方にここから出す（ライセンスは 2026-11-23 に各提供元のページで確認）
export const sources: Source[] = [
  {
    name: "Ember Yearly Electricity Data（国別・米国の州別の電力の CO2）",
    provider: "Ember",
    url: "https://ember-energy.org/data/yearly-electricity-data/",
    license: "CC BY 4.0",
    licenseUrl: "https://ember-energy.org/creative-commons/",
    retrievedAt: CARBON.generatedAt,
  },
  {
    name: "Google Cloud region carbon info（リージョンごとの送電網の CO2 と CFE%）",
    provider: "Google Cloud",
    url: "https://github.com/GoogleCloudPlatform/region-carbon-info",
    license: "Apache License 2.0",
    licenseUrl: "https://github.com/GoogleCloudPlatform/region-carbon-info/blob/main/LICENSE",
    retrievedAt: CARBON.generatedAt,
  },
  {
    name: "Azure network round-trip latency statistics（リージョン間の往復時間の実測値）",
    provider: "Microsoft",
    url: "https://learn.microsoft.com/azure/networking/azure-network-latency",
    license: "CC BY 4.0",
    licenseUrl: "https://github.com/MicrosoftDocs/azure-docs/blob/main/LICENSE",
    retrievedAt: CARBON.generatedAt,
    note: `${AZURE_RTT_MEASURED_ON} までの30日間の中央値`,
  },
  {
    name: "リージョンの所在地（各社の公式のリージョン一覧から作成）",
    provider: "Google Cloud / AWS / Microsoft Azure",
    url: "https://github.com/zzzzico12/claude/blob/main/advent-2026/green-region-finder/lib/regions.ts",
    license: "座標は所在都市のもの（このアプリで作成）",
    retrievedAt: "2026-11-23",
  },
  {
    name: "地図タイル",
    provider: "OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    license: "ODbL",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/",
    retrievedAt: "表示のたびに取得",
  },
];
