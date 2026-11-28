import type { Source } from "@advent/attribution";

// 出典は画面・README・API の応答にここから出す（利用条件は 2026-11-28 に各提供元のページで確認）
export const sources: Source[] = [
  {
    name: "接近天体データ（SBDB Close-Approach Data API）と衝突リスクの一覧（Sentry）",
    provider: "NASA JPL Center for Near Earth Object Studies（CNEOS）",
    url: "https://ssd-api.jpl.nasa.gov/",
    license: "米国政府の作成物（著作権なし）。出典として NASA/JPL を表示",
    licenseUrl: "https://www.jpl.nasa.gov/jpl-image-use-policy",
    retrievedAt: "6時間ごとに取得（Sentry は1日ごと）",
  },
  {
    name: "比べる物の大きさ（高さ・長さ・標高など）",
    provider: "Wikidata",
    url: "https://www.wikidata.org/",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    retrievedAt: "2026-11-28",
  },
];

export const sourcesEn: Source[] = [
  {
    name: "Close-approach data (SBDB Close-Approach Data API) and impact risk list (Sentry)",
    provider: "NASA JPL Center for Near Earth Object Studies (CNEOS)",
    url: "https://ssd-api.jpl.nasa.gov/",
    license: "US government work (no copyright). Credit NASA/JPL",
    licenseUrl: "https://www.jpl.nasa.gov/jpl-image-use-policy",
    retrievedAt: "every 6 hours (Sentry daily)",
  },
  {
    name: "Sizes of familiar objects (height, length, elevation, etc.)",
    provider: "Wikidata",
    url: "https://www.wikidata.org/",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    retrievedAt: "2026-11-28",
  },
];

export const ATTRIBUTION = {
  approaches: "NASA/JPL CNEOS SBDB Close-Approach Data API and Sentry (https://ssd-api.jpl.nasa.gov/)",
  objects: "Wikidata (CC0)",
};
