# CLAUDE.md

このリポジトリは、Qiitaアドベントカレンダー「AI×世界のオープンデータ」2026の25本のアプリをまとめたものです。実装はClaudeが担当し、人（リポジトリのオーナー）がレビュー・動作確認・記事の仕上げを担当します。

このフォルダは GitHub の `zzzzico12/claude` リポジトリの `advent-2026/` にある。リポジトリのルートの `apps/` には去年までのアプリが入っているので触らない。このファイルに出てくるパスは、特に断りがなければ `advent-2026/` からの相対パス。

## まず読むもの

- 企画書：`docs/plan.md`
- その日の仕様書：`<アプリ名>/README.md`（作るもの・使い道・確かめ方・工夫）。どの日がどのアプリかは下の一覧を見る
- 決まっていないこと：`docs/decisions.md`

## 作業の進め方

1. 指示された日の `README.md` を読み、実装の計画を「実装メモ」に書いてから着手する。計画に不明点があれば、実装前に質問する
2. ブランチ名は `advent/<アプリ名>` にする（例：`advent/forest-change-detector`）。1アプリ1フォルダ（`<アプリ名>/`）で、他のアプリのフォルダは触らない
3. 共通部品（`packages/`）で済むものは使い回す。共通化したほうがよい処理を見つけたら `packages/` に切り出す
4. 「確かめ方」の評価スクリプトを必ず作り、結果を `eval/RESULTS.md` に書く
5. 最後に `ARTICLE.md` の下書きを、実装メモと評価結果から書く。「まとめ」の感想部分は人が書くので空けておく
6. コミットメッセージは Conventional Commits（`feat(forest-change-detector): ...`、`fix(packages/globe): ...`）
7. アプリができたら、`advent-2026/README.md` のアプリ一覧に説明・技術・特徴・デモURLを追記する

## 必ず守るルール

- **数字はコードで計算し、AIには説明だけをさせる。** AIの文章に出てくる数字は、可能な限り元データと自動で照合する
- **出典を必ず表示する。** データ名・提供元・ライセンス・取得日を、画面とREADMEの両方に書く
- **APIキーをコミットしない。** `.env`（Git管理外）から読み、ブラウザに出してはいけないキーはサーバー側（API）で使う。必要なキーは `.env.example` に追記する
- **大きなデータはコミットしない。** `*/data/` はGit管理外。取得スクリプトを `scripts/` に置いて再現できるようにする
- **データ提供元に負荷をかけない。** レート制限を守り、キャッシュする。CelesTrakは数時間おきの取得にとどめる
- **ライセンスを守る。**
  - 名画・古地図は、パブリックドメイン（またはCC0）のものだけを使う
  - 非商用条件のもの（Open-Meteoの無料版、BirdNET、xeno-cantoの一部の録音、OpenF1など）を使う日は、READMEに明記する。サイトに広告は付けない
  - F1のロゴ・映像・チーム無線の音声は使わない
- **米国政府のデータ（NASAなど）** は、実装時と公開直前に動作を確認する
- **UIとドキュメントは日本語**、コードのコメントは日本語でも英語でもよい

## 技術スタック（初期案。変更する場合は docs/decisions.md に理由を書く）

- フロントエンド：TypeScript + Vite（日によってはReact）。pnpmのワークスペースで管理
- データ処理・機械学習：Python（uvで管理）
- AI：Claude API（モデル名は環境変数 `CLAUDE_MODEL` で切り替える）
- デプロイ：Vercel。1アプリ1プロジェクトで、Root Directory を `advent-2026/<アプリ名>` にする。ブラウザに出せないキーを使う処理は、各アプリの `api/` に置く Vercel Functions で動かす（docs/decisions.md）

## 25本の一覧

| Day | 日付 | フォルダ（アプリ名） | タイトル |
| --- | --- | --- | --- |
| 01 | 12/1 | `paper-survey` | 論文サーベイの自動化 |
| 02 | 12/2 | `dependency-risk-radar` | 依存ライブラリと脆弱性の優先度判定 |
| 03 | 12/3 | `green-region-finder` | CO2の少ないクラウドリージョン |
| 04 | 12/4 | `masterpiece-vscode-theme` | 名画のエディタ配色 |
| 05 | 12/5 | `forest-change-detector` | 衛星画像で森の変化を検知 |
| 06 | 12/6 | `satellite-tracker-3d` | 人工衛星は今どこ？ |
| 07 | 12/7 | `satellite-pass-api` | 衛星の通過予測API |
| 08 | 12/8 | `nasa-tech-finder` | NASAの特許から技術探し |
| 09 | 12/9 | `asteroid-size-compare` | 地球に近づく小惑星を身近なサイズで |
| 10 | 12/10 | `where-is-voyager` | ボイジャーは今どこ？ |
| 11 | 12/11 | `plane-overhead-guide` | 頭上の飛行機ガイド |
| 12 | 12/12 | `bird-song-identifier` | 鳥の声を聞き分けるAI |
| 13 | 12/13 | `walk-into-painting` | 名画の中を歩く |
| 14 | 12/14 | `similar-artwork-search` | 似ている作品の横断検索 |
| 15 | 12/15 | `harbor-ship-guide` | 港の船ガイド |
| 16 | 12/16 | `mountain-name-finder` | あの山の名前は？ |
| 17 | 12/17 | `balloon-flight-simulator` | 風船を飛ばしたらどこへ行く？ |
| 18 | 12/18 | `classic-character-chat` | 名作の登場人物と話す |
| 19 | 12/19 | `life-size-art-ar` | 名画を実物大で部屋に飾る |
| 20 | 12/20 | `old-map-walk` | 100年前の街を歩く |
| 21 | 12/21 | `darwin-voyage-map` | ダーウィンの航海をたどる |
| 22 | 12/22 | `roman-travel-planner` | 古代ローマの旅行計画 |
| 23 | 12/23 | `f1-ghost-lap` | F1のゴースト比較 |
| 24 | 12/24 | `f1-ai-commentary` | AIがF1を実況する |
| 25 | 12/25 | `santa-route-optimizer` | AIサンタの配達ルート |
