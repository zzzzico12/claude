import type { Source } from "@advent/attribution";

// 画面に出す出典（地球全体の地図・地域ごとの数字・その年の説明）
export const sources: Source[] = [
  {
    name: "Tree cover loss（地図のタイル、v1.13）",
    provider: "Hansen ら（UMD/Google/USGS/NASA）。配信：Global Nature Watch（旧 Global Forest Watch）の Tile Cache API。powered by Resource Watch",
    url: "https://www.globalnaturewatch.org/",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    retrievedAt: "表示のたびに取得",
    credit: "Hansen et al., 2013. High-Resolution Global Maps of 21st-Century Forest Cover Change. Accessed through Global Nature Watch.",
  },
  {
    name: "国ごと・年ごとの森林減少（gadm__tcl__iso_change：減少面積、火災による減少、原生林、原因）",
    provider: "Global Nature Watch（旧 Global Forest Watch）の Data API。減少は Hansen ら、火災は Tyukavina ら、原因は WRI・Google",
    url: "https://data-api.globalforestwatch.org/",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    retrievedAt: "2026-11-23",
    note: "樹冠の割合30%以上を森とする",
  },
  {
    name: "国と大陸の対応（Admin 0 Countries 1:50m）",
    provider: "Natural Earth",
    url: "https://www.naturalearthdata.com/",
    license: "パブリックドメイン",
    retrievedAt: "2026-11-23",
    note: "ロシアだけ「ロシア」として別にした",
  },
  {
    name: "背景の地図",
    provider: "OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    license: "ODbL",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/",
    retrievedAt: "表示のたびに取得",
  },
];

// ロンドニア州の衛星画像の分析（scripts/pipeline.py など。画面には出さない。README に載せる）
export const analysisSources: Source[] = [
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
    provider: "Hansen ら（メリーランド大学）",
    url: "https://glad.earthengine.app/view/global-forest-change",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    retrievedAt: "2026-11-23",
    credit: "Hansen, M. C. et al. 2013. High-Resolution Global Maps of 21st-Century Forest Cover Change. Science 342: 850–53.",
  },
  {
    name: "OpenStreetMap（道路・川）",
    provider: "OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    license: "ODbL",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/",
    retrievedAt: "2026-11-23",
  },
];
