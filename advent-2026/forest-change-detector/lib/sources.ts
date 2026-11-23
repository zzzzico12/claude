import type { Source } from "@advent/attribution";

// 出典は画面と README の両方にここから出す
export const sources: Source[] = [
  {
    name: "Sentinel-2 L2A（衛星画像）",
    provider: "欧州宇宙機関（ESA）・Copernicus。配信：Element 84 Earth Search（AWS のオープンデータ）",
    url: "https://registry.opendata.aws/sentinel-2-l2a-cogs/",
    license: "Copernicus のデータの利用条件（無料・自由に利用可。出典の明記が必要）",
    retrievedAt: "2026-11-23",
    credit: "Contains modified Copernicus Sentinel data [2024, 2025]",
  },
  {
    name: "Global Forest Change 2000–2025（v1.13、森林減少の正解）",
    provider: "Hansen ら（メリーランド大学）。Global Forest Watch の森林減少の元データ",
    url: "https://glad.earthengine.app/view/global-forest-change",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    retrievedAt: "2026-11-23",
    credit: "Hansen, M. C. et al. 2013. High-Resolution Global Maps of 21st-Century Forest Cover Change. Science 342: 850–53.",
  },
  {
    name: "OpenStreetMap（道路・川、地図）",
    provider: "OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    license: "ODbL",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/",
    retrievedAt: "2026-11-23",
  },
];
