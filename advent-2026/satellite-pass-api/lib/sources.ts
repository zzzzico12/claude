import type { Source } from "@advent/attribution";

// 出典は画面・README・API の応答にここから出す（利用条件は 2026-11-24 に各提供元のページで確認）
export const sources: Source[] = [
  {
    name: "GP データ（衛星の軌道要素。GROUP=stations・visual）",
    provider: "CelesTrak（元データは米宇宙軍 18th/19th SDS）",
    url: "https://celestrak.org/NORAD/elements/",
    license: "無償で公開。取得回数の制限あり（利用方針）",
    licenseUrl: "https://celestrak.org/usage-policy.php",
    retrievedAt: "2時間ごとに取得",
  },
  {
    name: "雲量の予報・地名の検索",
    provider: "Open-Meteo",
    url: "https://open-meteo.com/",
    license: "CC BY 4.0",
    licenseUrl: "https://open-meteo.com/en/licence",
    retrievedAt: "リアルタイム取得（雲量は1時間、地名は30日保存）",
    credit: "Weather data by Open-Meteo.com",
    nonCommercial: true,
    note: "無料版は非商用に限る。このサイトは無料で、広告を付けない",
  },
];

export const sourcesEn: Source[] = [
  {
    name: "GP data (orbital elements, GROUP=stations and visual)",
    provider: "CelesTrak (original data: US Space Force 18th/19th SDS)",
    url: "https://celestrak.org/NORAD/elements/",
    license: "Free to use, with request-rate limits (usage policy)",
    licenseUrl: "https://celestrak.org/usage-policy.php",
    retrievedAt: "every 2 hours",
  },
  {
    name: "Cloud cover forecast and place search",
    provider: "Open-Meteo",
    url: "https://open-meteo.com/",
    license: "CC BY 4.0",
    licenseUrl: "https://open-meteo.com/en/licence",
    retrievedAt: "real time (clouds cached 1 hour, places 30 days)",
    credit: "Weather data by Open-Meteo.com",
    nonCommercial: true,
    note: "The free tier is for non-commercial use only. This site is free and has no ads",
  },
];

/** 評価だけに使うデータ */
export const evalSources: Source[] = [
  {
    name: "Spot the Station の見える時刻（都市ごとの XML）",
    provider: "NASA Johnson Space Center",
    url: "https://nasa-public-data.s3.amazonaws.com/iss-coords/current/ISS_sightings/",
    license: "米国政府の著作物（パブリックドメイン）",
    retrievedAt: "2026-11-24",
  },
];

/** API の応答に入れる短い出典 */
export const ATTRIBUTION = {
  orbits: "CelesTrak (https://celestrak.org/)",
  weather: "Weather data by Open-Meteo.com (CC BY 4.0, non-commercial)",
};
