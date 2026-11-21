# アカウントとAPIキー

取得したキーは `.env` に書く（`.env.example` をコピー）。**コミットしないこと。**

| サービス | 使う日 | 必要なもの | 備考 |
| --- | --- | --- | --- |
| Anthropic（Claude API） | 全日 | APIキー | アプリの中でClaudeを呼ぶ |
| OpenAlex | Day01 | 無料のAPIキー | 2026年2月から必須。openalex.org の設定画面で取得 |
| Unpaywall | Day01 | メールアドレス | リクエストにメールアドレスを付ける |
| Ember | Day03 | APIキー（要確認） | 国別の電力データ |
| Copernicus Data Space | Day05 | アカウント | Sentinel-2の衛星画像 |
| Global Forest Watch | Day05 | APIキー（要確認） | 森林減少データ |
| Cesium ion | Day06ほか | アクセストークン | 3Dの地球儀（使う場合） |
| NASA（api.nasa.gov） | Day08 | 無料のAPIキー | 技術移転API。デモ用キーは回数制限が厳しい |
| OpenSky Network | Day11 | APIクライアント（OAuth2） | 2026年3月からID/パスワード認証は廃止。アカウント画面でAPIクライアントを作る |
| xeno-canto | Day12 | APIキー（要確認） | 録音ごとにライセンスが違う |
| 船舶位置データ（AIS） | Day15 | 登録（要確認） | 北欧の公開データを想定。対象の港に合わせて選ぶ |
| GitHub | 全体 | gh CLI のログイン | Issueの一括作成に使う |

キー不要で使える見込みのもの：arXiv、deps.dev、OSV、CISA KEV、EPSS、CelesTrak、NASA JPL（接近天体・Horizons）、メトロポリタン美術館、シカゴ美術館、Wikidata、GBIF、Open-Meteo（非商用）、Copernicus DEM（AWSの公開データ）、OpenStreetMap、Project Gutenberg、GeoNames（無料登録が必要な場合あり）、Itiner-e、Pleiades、OpenF1、OurAirports。
