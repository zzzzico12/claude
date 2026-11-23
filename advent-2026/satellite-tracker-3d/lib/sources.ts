import type { Source } from "@advent/attribution";

// 出典は画面と README の両方にここから出す（利用条件は 2026-11-23 に各提供元のページで確認）
export const CATALOG_BUILT_AT = "2026-11-23";

export const sources: Source[] = [
  {
    name: "GP データ（稼働中の衛星の軌道要素。GROUP=active）",
    provider: "CelesTrak（元データは米宇宙軍 18th/19th SDS）",
    url: "https://celestrak.org/NORAD/elements/",
    license: "無償で公開。取得回数の制限あり（利用方針）",
    licenseUrl: "https://celestrak.org/usage-policy.php",
    retrievedAt: "2時間ごとに取得（画面に取得時刻を表示）",
  },
  {
    name: "SATCAT（衛星カタログ：所有者・打ち上げ日）と、分類（GROUP）",
    provider: "CelesTrak",
    url: "https://celestrak.org/satcat/",
    license: "無償で公開（利用方針）",
    licenseUrl: "https://celestrak.org/usage-policy.php",
    retrievedAt: CATALOG_BUILT_AT,
  },
  {
    name: "UCS Satellite Database（目的・利用者・運用者。2023年5月1日版）",
    provider: "Union of Concerned Scientists",
    url: "https://www.ucs.org/resources/satellite-database",
    license: "明示のライセンスなし（研究用に公開。出典を表示し、選んだ衛星の一部の項目だけを表示）",
    retrievedAt: CATALOG_BUILT_AT,
    note: "2023年5月で更新が止まっていて、それ以降の衛星は載っていない",
  },
  {
    name: "Natural Earth II（地球儀の地図。CesiumJS に同梱）",
    provider: "Natural Earth",
    url: "https://www.naturalearthdata.com/",
    license: "パブリックドメイン",
    licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
    retrievedAt: "CesiumJS 1.147 に同梱の版",
  },
];

/** 英語の画面用（中身は sources と同じ） */
export const sourcesEn: Source[] = [
  {
    name: "GP data (orbital elements of active satellites, GROUP=active)",
    provider: "CelesTrak (original data: US Space Force 18th/19th SDS)",
    url: "https://celestrak.org/NORAD/elements/",
    license: "Free to use, with request-rate limits (usage policy)",
    licenseUrl: "https://celestrak.org/usage-policy.php",
    retrievedAt: "every 2 hours (fetch time shown at the top)",
  },
  {
    name: "SATCAT (satellite catalog: owner, launch date) and GROUP lists",
    provider: "CelesTrak",
    url: "https://celestrak.org/satcat/",
    license: "Free to use (usage policy)",
    licenseUrl: "https://celestrak.org/usage-policy.php",
    retrievedAt: CATALOG_BUILT_AT,
  },
  {
    name: "UCS Satellite Database (purpose, users, operator; 1 May 2023 edition)",
    provider: "Union of Concerned Scientists",
    url: "https://www.ucs.org/resources/satellite-database",
    license: "No explicit license (published for research; only some fields of the selected satellite are shown, with attribution)",
    retrievedAt: CATALOG_BUILT_AT,
    note: "Updates stopped in May 2023, so later satellites are not listed",
  },
  {
    name: "Natural Earth II (globe imagery bundled with CesiumJS)",
    provider: "Natural Earth",
    url: "https://www.naturalearthdata.com/",
    license: "Public domain",
    licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
    retrievedAt: "version bundled with CesiumJS 1.147",
  },
];

/** 評価だけに使うデータ（画面では使わない） */
export const evalSources: Source[] = [
  {
    name: "ISS の軌道データ（ISS.OEM_J2K_EPH）",
    provider: "NASA Johnson Space Center（Flight Operations Directorate）",
    url: "https://nasa-public-data.s3.amazonaws.com/iss-coords/current/ISS_OEM/ISS.OEM_J2K_EPH.txt",
    license: "米国政府の著作物（パブリックドメイン）",
    retrievedAt: "2026-11-23",
  },
];
