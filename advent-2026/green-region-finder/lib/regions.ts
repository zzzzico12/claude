// クラウドのリージョンの所在地（事前に作った一覧。2026-11-23 時点）
// - 座標は所在都市（またはデータセンターのある町）のもの。距離から遅延を推定するのに使うので、都市単位の精度で十分
// - iso3：Ember の国コード。state：米国の州コード（Ember の州別データを使う）
// - public: false は一般公開されていない Google Cloud のリージョン（評価にだけ使う）
// 出典：各社の公式のリージョン一覧（Google Cloud: cloud.google.com/about/locations、
//       AWS: aws.amazon.com/about-aws/global-infrastructure/regions_az、Azure: datacenters.microsoft.com）

export type Provider = "gcp" | "aws" | "azure";

export interface Region {
  provider: Provider;
  id: string;
  /** 所在地（日本語） */
  city: string;
  iso3: string;
  state?: string;
  lat: number;
  lon: number;
  public?: false;
}

const r = (provider: Provider, id: string, city: string, iso3: string, lat: number, lon: number, state?: string, isPublic = true): Region => ({
  provider,
  id,
  city,
  iso3,
  lat,
  lon,
  ...(state ? { state } : {}),
  ...(isPublic ? {} : { public: false as const }),
});

export const REGIONS: Region[] = [
  // ---------- Google Cloud ----------
  r("gcp", "africa-south1", "ヨハネスブルグ", "ZAF", -26.2, 28.05),
  r("gcp", "asia-east1", "台湾（彰化県）", "TWN", 24.05, 120.52),
  r("gcp", "asia-east2", "香港", "HKG", 22.32, 114.17),
  r("gcp", "asia-northeast1", "東京", "JPN", 35.68, 139.69),
  r("gcp", "asia-northeast2", "大阪", "JPN", 34.69, 135.5),
  r("gcp", "asia-northeast3", "ソウル", "KOR", 37.57, 126.98),
  r("gcp", "asia-south1", "ムンバイ", "IND", 19.08, 72.88),
  r("gcp", "asia-south2", "デリー", "IND", 28.61, 77.21),
  r("gcp", "asia-southeast1", "シンガポール", "SGP", 1.35, 103.82),
  r("gcp", "asia-southeast2", "ジャカルタ", "IDN", -6.21, 106.85),
  r("gcp", "asia-southeast3", "バンコク", "THA", 13.76, 100.5),
  r("gcp", "australia-southeast1", "シドニー", "AUS", -33.87, 151.21),
  r("gcp", "australia-southeast2", "メルボルン", "AUS", -37.81, 144.96),
  r("gcp", "europe-central2", "ワルシャワ", "POL", 52.23, 21.01),
  r("gcp", "europe-north1", "フィンランド（ハミナ）", "FIN", 60.57, 27.2),
  r("gcp", "europe-north2", "ストックホルム", "SWE", 59.33, 18.07),
  r("gcp", "europe-southwest1", "マドリード", "ESP", 40.42, -3.7),
  r("gcp", "europe-west1", "ベルギー（サン=ギスラン）", "BEL", 50.45, 3.82),
  r("gcp", "europe-west2", "ロンドン", "GBR", 51.51, -0.13),
  r("gcp", "europe-west3", "フランクフルト", "DEU", 50.11, 8.68),
  r("gcp", "europe-west4", "オランダ（エームスハーフェン）", "NLD", 53.44, 6.83),
  r("gcp", "europe-west6", "チューリッヒ", "CHE", 47.38, 8.54),
  r("gcp", "europe-west8", "ミラノ", "ITA", 45.46, 9.19),
  r("gcp", "europe-west9", "パリ", "FRA", 48.86, 2.35),
  r("gcp", "europe-west10", "ベルリン", "DEU", 52.52, 13.4),
  r("gcp", "europe-west12", "トリノ", "ITA", 45.07, 7.69),
  r("gcp", "me-central1", "ドーハ", "QAT", 25.29, 51.53),
  r("gcp", "me-central2", "ダンマーム", "SAU", 26.43, 50.1),
  r("gcp", "me-west1", "テルアビブ", "ISR", 32.09, 34.78),
  r("gcp", "northamerica-northeast1", "モントリオール", "CAN", 45.5, -73.57),
  r("gcp", "northamerica-northeast2", "トロント", "CAN", 43.65, -79.38),
  r("gcp", "northamerica-south1", "メキシコ（ケレタロ）", "MEX", 20.59, -100.39),
  r("gcp", "southamerica-east1", "サンパウロ", "BRA", -23.55, -46.63),
  r("gcp", "southamerica-west1", "サンティアゴ", "CHL", -33.45, -70.67),
  r("gcp", "us-central1", "アイオワ州（カウンシルブラフス）", "USA", 41.26, -95.86, "IA"),
  r("gcp", "us-east1", "サウスカロライナ州（モンクスコーナー）", "USA", 33.2, -80.01, "SC"),
  r("gcp", "us-east4", "バージニア州北部（アッシュバーン）", "USA", 39.04, -77.49, "VA"),
  r("gcp", "us-east5", "オハイオ州（コロンバス）", "USA", 39.96, -83.0, "OH"),
  r("gcp", "us-south1", "テキサス州（ダラス）", "USA", 32.78, -96.8, "TX"),
  r("gcp", "us-west1", "オレゴン州（ザ・ダレス）", "USA", 45.59, -121.18, "OR"),
  r("gcp", "us-west2", "ロサンゼルス", "USA", 34.05, -118.24, "CA"),
  r("gcp", "us-west3", "ソルトレイクシティ", "USA", 40.76, -111.89, "UT"),
  r("gcp", "us-west4", "ラスベガス", "USA", 36.17, -115.14, "NV"),
  r("gcp", "us-central2", "オクラホマ州", "USA", 36.31, -95.32, "OK", false),
  r("gcp", "us-east2", "ジョージア州", "USA", 33.75, -84.39, "GA", false),

  // ---------- AWS ----------
  r("aws", "us-east-1", "バージニア州北部", "USA", 39.04, -77.49, "VA"),
  r("aws", "us-east-2", "オハイオ州", "USA", 39.96, -83.0, "OH"),
  r("aws", "us-west-1", "北カリフォルニア", "USA", 37.34, -121.89, "CA"),
  r("aws", "us-west-2", "オレゴン州", "USA", 45.84, -119.7, "OR"),
  r("aws", "af-south-1", "ケープタウン", "ZAF", -33.92, 18.42),
  r("aws", "ap-east-1", "香港", "HKG", 22.32, 114.17),
  r("aws", "ap-east-2", "台北", "TWN", 25.03, 121.57),
  r("aws", "ap-south-1", "ムンバイ", "IND", 19.08, 72.88),
  r("aws", "ap-south-2", "ハイデラバード", "IND", 17.39, 78.49),
  r("aws", "ap-southeast-1", "シンガポール", "SGP", 1.35, 103.82),
  r("aws", "ap-southeast-2", "シドニー", "AUS", -33.87, 151.21),
  r("aws", "ap-southeast-3", "ジャカルタ", "IDN", -6.21, 106.85),
  r("aws", "ap-southeast-4", "メルボルン", "AUS", -37.81, 144.96),
  r("aws", "ap-southeast-5", "マレーシア（クアラルンプール）", "MYS", 3.14, 101.69),
  r("aws", "ap-southeast-6", "ニュージーランド（オークランド）", "NZL", -36.85, 174.76),
  r("aws", "ap-southeast-7", "タイ（バンコク）", "THA", 13.76, 100.5),
  r("aws", "ap-northeast-1", "東京", "JPN", 35.68, 139.69),
  r("aws", "ap-northeast-2", "ソウル", "KOR", 37.57, 126.98),
  r("aws", "ap-northeast-3", "大阪", "JPN", 34.69, 135.5),
  r("aws", "ca-central-1", "モントリオール", "CAN", 45.5, -73.57),
  r("aws", "ca-west-1", "カルガリー", "CAN", 51.05, -114.07),
  r("aws", "eu-central-1", "フランクフルト", "DEU", 50.11, 8.68),
  r("aws", "eu-central-2", "チューリッヒ", "CHE", 47.38, 8.54),
  r("aws", "eu-west-1", "アイルランド（ダブリン）", "IRL", 53.35, -6.26),
  r("aws", "eu-west-2", "ロンドン", "GBR", 51.51, -0.13),
  r("aws", "eu-west-3", "パリ", "FRA", 48.86, 2.35),
  r("aws", "eu-south-1", "ミラノ", "ITA", 45.46, 9.19),
  r("aws", "eu-south-2", "スペイン（アラゴン）", "ESP", 41.65, -0.89),
  r("aws", "eu-north-1", "ストックホルム", "SWE", 59.33, 18.07),
  r("aws", "il-central-1", "テルアビブ", "ISR", 32.09, 34.78),
  r("aws", "me-south-1", "バーレーン", "BHR", 26.07, 50.56),
  r("aws", "me-central-1", "アラブ首長国連邦", "ARE", 24.45, 54.38),
  r("aws", "mx-central-1", "メキシコ（ケレタロ）", "MEX", 20.59, -100.39),
  r("aws", "sa-east-1", "サンパウロ", "BRA", -23.55, -46.63),

  // ---------- Azure ----------
  r("azure", "eastus", "バージニア州", "USA", 36.67, -78.39, "VA"),
  r("azure", "eastus2", "バージニア州", "USA", 36.67, -78.39, "VA"),
  r("azure", "centralus", "アイオワ州", "USA", 41.59, -93.62, "IA"),
  r("azure", "northcentralus", "イリノイ州（シカゴ）", "USA", 41.88, -87.63, "IL"),
  r("azure", "southcentralus", "テキサス州（サンアントニオ）", "USA", 29.42, -98.49, "TX"),
  r("azure", "westcentralus", "ワイオミング州", "USA", 41.14, -104.82, "WY"),
  r("azure", "westus", "カリフォルニア州", "USA", 37.77, -122.42, "CA"),
  r("azure", "westus2", "ワシントン州", "USA", 47.23, -119.85, "WA"),
  r("azure", "westus3", "アリゾナ州（フェニックス）", "USA", 33.45, -112.07, "AZ"),
  r("azure", "canadacentral", "トロント", "CAN", 43.65, -79.38),
  r("azure", "canadaeast", "ケベックシティ", "CAN", 46.81, -71.21),
  r("azure", "brazilsouth", "サンパウロ州", "BRA", -23.55, -46.63),
  r("azure", "mexicocentral", "メキシコ（ケレタロ）", "MEX", 20.59, -100.39),
  r("azure", "northeurope", "アイルランド（ダブリン）", "IRL", 53.35, -6.26),
  r("azure", "westeurope", "オランダ（アムステルダム）", "NLD", 52.37, 4.9),
  r("azure", "uksouth", "ロンドン", "GBR", 51.51, -0.13),
  r("azure", "ukwest", "カーディフ", "GBR", 51.48, -3.18),
  r("azure", "francecentral", "パリ", "FRA", 48.86, 2.35),
  r("azure", "germanywestcentral", "フランクフルト", "DEU", 50.11, 8.68),
  r("azure", "swedencentral", "スウェーデン（イェヴレ）", "SWE", 60.67, 17.14),
  r("azure", "norwayeast", "オスロ", "NOR", 59.91, 10.75),
  r("azure", "switzerlandnorth", "チューリッヒ", "CHE", 47.38, 8.54),
  r("azure", "polandcentral", "ワルシャワ", "POL", 52.23, 21.01),
  r("azure", "italynorth", "ミラノ", "ITA", 45.46, 9.19),
  r("azure", "spaincentral", "マドリード", "ESP", 40.42, -3.7),
  r("azure", "eastasia", "香港", "HKG", 22.32, 114.17),
  r("azure", "southeastasia", "シンガポール", "SGP", 1.35, 103.82),
  r("azure", "japaneast", "東京・埼玉", "JPN", 35.68, 139.69),
  r("azure", "japanwest", "大阪", "JPN", 34.69, 135.5),
  r("azure", "koreacentral", "ソウル", "KOR", 37.57, 126.98),
  r("azure", "koreasouth", "釜山", "KOR", 35.18, 129.08),
  r("azure", "centralindia", "プネー", "IND", 18.52, 73.86),
  r("azure", "southindia", "チェンナイ", "IND", 13.08, 80.27),
  r("azure", "westindia", "ムンバイ", "IND", 19.08, 72.88),
  r("azure", "australiaeast", "ニューサウスウェールズ州（シドニー）", "AUS", -33.87, 151.21),
  r("azure", "australiasoutheast", "ビクトリア州（メルボルン）", "AUS", -37.81, 144.96),
  r("azure", "australiacentral", "キャンベラ", "AUS", -35.28, 149.13),
  r("azure", "southafricanorth", "ヨハネスブルグ", "ZAF", -26.2, 28.05),
  r("azure", "uaenorth", "ドバイ", "ARE", 25.2, 55.27),
  r("azure", "qatarcentral", "ドーハ", "QAT", 25.29, 51.53),
  r("azure", "israelcentral", "イスラエル", "ISR", 32.09, 34.78),
  r("azure", "newzealandnorth", "オークランド", "NZL", -36.85, 174.76),
  r("azure", "indonesiacentral", "ジャカルタ", "IDN", -6.21, 106.85),
  r("azure", "malaysiawest", "クアラルンプール", "MYS", 3.14, 101.69),
];

export const PROVIDER_LABEL: Record<Provider, string> = { gcp: "Google Cloud", aws: "AWS", azure: "Azure" };

/** 国コード → 日本語の国名（画面と「国内のみ」の絞り込みに使う） */
export const COUNTRY_JA: Record<string, string> = {
  ZAF: "南アフリカ", TWN: "台湾", HKG: "香港", JPN: "日本", KOR: "韓国", IND: "インド", SGP: "シンガポール",
  IDN: "インドネシア", THA: "タイ", AUS: "オーストラリア", POL: "ポーランド", FIN: "フィンランド", SWE: "スウェーデン",
  ESP: "スペイン", BEL: "ベルギー", GBR: "イギリス", DEU: "ドイツ", NLD: "オランダ", CHE: "スイス", ITA: "イタリア",
  FRA: "フランス", QAT: "カタール", SAU: "サウジアラビア", ISR: "イスラエル", CAN: "カナダ", MEX: "メキシコ",
  BRA: "ブラジル", CHL: "チリ", USA: "アメリカ", IRL: "アイルランド", BHR: "バーレーン", ARE: "アラブ首長国連邦",
  MYS: "マレーシア", NZL: "ニュージーランド", NOR: "ノルウェー",
};
