import type { Source } from "@advent/attribution";

// 出典はレポートと README の両方にここから出す（2026-11-23 に各提供元のページで確認）
export const sources: Source[] = [
  {
    name: "OSV（オープンソースの脆弱性データベース）",
    provider: "Google / OpenSSF",
    url: "https://osv.dev/",
    license: "元データベースごとのライセンス（GitHub Advisory Database・PyPI Advisory Database・Go Vulnerability Database は CC BY 4.0）",
    licenseUrl: "https://google.github.io/osv.dev/data/",
    retrievedAt: "実行のたびに取得",
    credit: "GitHub Advisory Database（CC BY 4.0）、PyPI Advisory Database（CC BY 4.0）",
  },
  {
    name: "deps.dev（パッケージのバージョン・非推奨・リポジトリ）",
    provider: "Google Open Source Insights",
    url: "https://deps.dev/",
    license: "データのライセンスの明記なし（Google 利用規約）",
    licenseUrl: "https://policies.google.com/terms",
    retrievedAt: "実行のたびに取得",
  },
  {
    name: "CISA Known Exploited Vulnerabilities Catalog",
    provider: "CISA（米国 サイバーセキュリティ・社会基盤安全保障庁）",
    url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    license: "CC0 1.0",
    licenseUrl: "https://www.cisa.gov/sites/default/files/licenses/kev/license.txt",
    retrievedAt: "実行のたびに取得",
    note: "CISA・DHS による推奨を意味しない",
  },
  {
    name: "EPSS（Exploit Prediction Scoring System）",
    provider: "FIRST（EPSS SIG）",
    url: "https://www.first.org/epss/",
    license: "無料・登録不要（利用時は出典の明記が求められている）",
    licenseUrl: "https://www.first.org/epss/faq",
    retrievedAt: "実行のたびに取得",
    credit: "EPSS scores by FIRST (https://www.first.org/epss/)",
  },
];
