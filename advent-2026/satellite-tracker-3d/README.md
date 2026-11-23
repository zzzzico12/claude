# Day 06（12/6 日）人工衛星は今どこ？

- **アプリ名（フォルダ名）**：`satellite-tracker-3d`
- **ジャンル**：宇宙
- **完成形**：Webアプリ
- **組み合わせるデータ**：CelesTrak × UCS Satellite Database
- **AI・技術の見どころ**：軌道計算＋1万機の3D描画

## 作るもの

3Dの地球儀に、今動いている約1万機の人工衛星をリアルタイムで表示する。Starlink、GPS、気象衛星などで絞り込み、クリックすると「どこの国の、何のための衛星か」をAIが解説する

## 使い道

宇宙の混み具合を知る。大量の点をブラウザで滑らかに描く技術の実践例

## 使い方

デモ：（公開後に記入）

### 画面

1. 開くと、今動いている全衛星（約1万7千機）が地球儀の上を実時間で動く。色は種類（Starlink・他の通信衛星群・通信・測位・気象・地球観測・宇宙ステーション・その他）
2. 「60倍」「600倍」で時間を速めると、低軌道の衛星が地球を回る様子や、静止軌道の衛星が止まって見える様子が分かる
3. 右の「種類」「軌道」「国・組織」で絞り込む。例：「Starlink 以外」を押すと、残りの約5,700機の分布が見える
4. 点をクリックするか、「衛星を探す」に名前（ISS、HIMAWARI、QZS など）を入れると、その衛星の国・打ち上げ日・軌道・目的（UCS に載っていれば）と、今の位置が出る。白い輪は今の軌道
5. 「AI に解説してもらう」で、Claude が「どこの国の、何のための衛星か」を3段落で解説する。数字は自動で照合し、合わないものに ⚠ を付ける
6. URL の最後に `#25544` のように NORAD 番号を付けると、その衛星を選んだ状態で開く

### 使用例

- **宇宙の混み具合を見る**：全機表示 → 低軌道に Starlink（青）が地球を覆っている。「Starlink 以外」にすると、中軌道に GPS などの測位衛星（黄）、静止軌道の輪に通信・気象衛星が並ぶのが見える
- **日本の衛星**：「国・組織」で日本を選ぶ（133機）。みちびき（QZS）は「傾斜対地同期軌道」で、日本の上空で8の字を描く
- **ISS を追う**：「衛星を探す」に ISS → 600倍にすると約9秒で地球を1周する

### 手元で動かす

```sh
cd advent-2026/satellite-tracker-3d
pnpm catalog      # 衛星カタログ（CelesTrak・UCS）を取得して public/data/ に書く。取得したものは data/ に保存して使い回す
pnpm dev          # http://localhost:5206
pnpm eval         # 評価（AI の解説の評価も行うときは pnpm eval -- --ai。約0.04ドル）
```

- 手元では、保存先（Upstash Redis）の環境変数がないとき、CelesTrak には問い合わせず、`pnpm catalog` が保存した `data/celestrak/active-*.json` を軌道要素として使う
- AI の解説を手元で試すときは、`advent-2026/.env` に `ANTHROPIC_API_KEY` が必要

## 効果

- 「宇宙が混んでいる」を、数字ではなく目で見られる。稼働中の16,904機のうち11,199機（66%）が Starlink で、低軌道の1つの殻を覆っている
- 衛星の名前だけでは分からない「誰が・何のために」を、カタログの事実と軌道の数字から、根拠つきで説明する。AI の解説の数字は照合しているので、作り話の数字は ⚠ で分かる
- 1万7千機を毎フレーム動かしても、ブラウザで滑らかに描ける作り方（Worker で間引いて計算し、補間する）の実例になる

## 確かめ方（評価）

ISSなど位置が公表されている衛星で、計算した位置のずれを測る。描画が毎秒60コマで動くかも見る

評価のスクリプトと結果は `eval/` に置く。

## 1日で作る工夫・注意

軌道計算はsatellite.jsなど、地球儀はCesiumJSなどを使う。CelesTrakは頻繁なダウンロードを控えるよう求めているので、数時間おきにまとめて取る

## 必要な環境変数

- `ANTHROPIC_API_KEY`（AI の解説。Vercel ではサーバー側だけで使う）
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`（または `KV_REST_API_URL` / `KV_REST_API_TOKEN`）：**公開デモでは必須**。軌道要素を2時間キャッシュして CelesTrak への問い合わせを抑えるのと、AI の解説の回数の上限に使う
- `CESIUM_ION_TOKEN` は使わない（Cesium ion を使わず、CesiumJS に同梱の地図にしたため。2026-11-23 に決定）

## 実装チェックリスト

- [ ] データの取得方法と利用条件（ライセンス・クレジット表記・非商用の有無）を確認し、下の「データと出典」に書いた
- [ ] 大きなデータは事前に取得して `data/`（Git管理外）に置いた。取得スクリプトは `scripts/` に置いた
- [ ] 実装の計画をこのファイルの「実装メモ」に書いた
- [ ] 動くものができた（`src/`）
- [ ] 確かめ方のスクリプトを動かし、結果を `eval/RESULTS.md` に書いた
- [ ] 画面またはREADMEに出典を表示した
- [ ] スマホなど実機での動作確認をした（必要な場合）
- [ ] デプロイした
- [ ] 記事の下書き `ARTICLE.md` を書いた

## データと出典

画面の下にも同じ内容を表示している（[lib/sources.ts](lib/sources.ts) から両方に出す）。

| データ | 提供元 | ライセンス | 取得日 | 備考 |
| --- | --- | --- | --- | --- |
| [GP データ（稼働中の衛星の軌道要素。GROUP=active）](https://celestrak.org/NORAD/elements/) | CelesTrak（元データは米宇宙軍 18th/19th SDS） | [無償で公開。取得回数の制限あり（利用方針）](https://celestrak.org/usage-policy.php) | 2時間ごとに取得（画面に取得時刻を表示） |  |
| [SATCAT（衛星カタログ：所有者・打ち上げ日）と、分類（GROUP）](https://celestrak.org/satcat/) | CelesTrak | [無償で公開（利用方針）](https://celestrak.org/usage-policy.php) | 2026-11-23 |  |
| [UCS Satellite Database（目的・利用者・運用者。2023年5月1日版）](https://www.ucs.org/resources/satellite-database) | Union of Concerned Scientists | 明示のライセンスなし（研究用に公開。出典を表示して一部の項目を使用） | 2026-11-23 | 2023年5月で更新が止まっていて、それ以降の衛星は載っていない |
| [Natural Earth II（地球儀の地図。CesiumJS に同梱）](https://www.naturalearthdata.com/) | Natural Earth | [パブリックドメイン](https://www.naturalearthdata.com/about/terms-of-use/) | CesiumJS 1.147 に同梱の版 |  |

評価だけに使うデータ：

| データ | 提供元 | ライセンス | 取得日 | 備考 |
| --- | --- | --- | --- | --- |
| [ISS の軌道データ（ISS.OEM_J2K_EPH）](https://nasa-public-data.s3.amazonaws.com/iss-coords/current/ISS_OEM/ISS.OEM_J2K_EPH.txt) | NASA Johnson Space Center（Flight Operations Directorate） | 米国政府の著作物（パブリックドメイン） | 2026-11-23 |  |

- **CelesTrak の取得回数**：大きなデータ（active・starlink）は取得回数が制限され、超えると 403 などで止められる（[利用方針](https://celestrak.org/usage-policy.php)）。公開デモでは、サーバー（[lib/gp-source.ts](lib/gp-source.ts)）が2時間に1回だけ取り、保存したものを全員に配る。カタログを作るときの小さな分類（GROUP）は33個を2秒ずつ間をあけて取り、`data/` に保存して使い回す
- **UCS のライセンス**：ページに利用条件の明記がない。「研究用のツールとして公開している」とあるので、出典を表示し、目的・利用者・運用者などの一部の項目だけを使う。元のファイルはリポジトリに入れない

## 実装メモ

### 計画（2026-11-23、実装前）

**下調べで分かったこと**

- CelesTrak の稼働中の衛星（GROUP=active、JSON）：16,904機（2026-11-23）。そのうち Starlink は11,199機、OneWeb 651、Kuiper 391、千帆（Qianfan）275、国網（Hulianwang）261。約1万機ではなく約1万7千機
- CelesTrak は大きなデータ（active・Starlink）の取得回数を制限していて、取りすぎると 403 などで止められる。データの更新は約2時間おき。利用者が多いアプリは、キャッシュする仕組み（プロキシ）を自分で用意するよう求めている
- UCS Satellite Database は2023年5月1日版（7,560機）で更新が止まっている（2024年1月に「更新を一時停止」と告知）。それ以降に打ち上げた衛星（Starlink の半分以上など）は載っていない。利用条件は実装時に確認する
- 位置の答え合わせには、NASA が公開している ISS の軌道データ（ISS.OEM_J2K_EPH.txt）を使える。15日分が4分おきで、管制センターの計算なので、CelesTrak の軌道要素とは独立した答えになる

**構成**

| 部分 | やり方 |
| --- | --- |
| 軌道要素の配信 | Vercel Functions の `api/gp.ts` で CelesTrak から取得し、Upstash Redis に2時間以上キャッシュする。ブラウザには計算に必要な項目だけを渡す。CelesTrak に問い合わせるのは、何人が見ていても2時間に1回まで |
| 衛星の素性 | CelesTrak SATCAT（国・打ち上げ日・種類）と UCS（目的・利用者・運用者）を NORAD 番号で結びつけ、事前に JSON にしておく（`scripts/`） |
| 軌道計算 | satellite.js（v7）の SGP4。1万7千機を毎フレーム計算すると重いので、Web Worker で0.5〜1秒ごとに計算し、そのあいだの位置は補間する |
| 地球儀 | CesiumJS（v1.147）。点は PointPrimitiveCollection で1万7千個を一度に描く |
| 絞り込み | 軌道の高さ（低軌道・中軌道・静止軌道）、種類（Starlink・OneWeb・GPS などの測位・気象・地球観測・宇宙ステーション）、国 |
| AI の解説 | 衛星をクリックすると `api/explain.ts` で Claude が「どこの国の、何のための衛星か」を解説する。渡すのは SATCAT・UCS の項目と、コードで計算した高さ・周期・軌道傾斜角。数字は照合する。衛星ごとに Redis にキャッシュし、公開デモは1日の回数に上限を付ける |
| 共通部品 | 軌道計算は `packages/orbit`（Day07 の通過予測でも使う）、地球儀は `packages/globe` に切り出す |

**評価（eval/）**（計画）

1. 位置のずれ：ISS について、CelesTrak の軌道要素から計算した位置と、NASA の軌道データを比べる。軌道要素の時刻（エポック）から何時間たつと、何 km ずれるかを表にする
2. 計算の速さ：1万7千機の位置を1回計算するのに何ミリ秒かかるか（Node で測る）
3. 描画の速さ：画面に1秒あたりのコマ数を出す表示を付け、人がブラウザで見て記録する（Playwright などは入れない）

### 決めたこと（2026-11-23、利用者と相談）

- 地図は Cesium ion を使わず、CesiumJS に同梱の Natural Earth II にする（キーも使用量の上限もいらない。画質はそこそこ）
- UCS に載っていない衛星（全体の7割）も、CelesTrak のカタログと名前から解説する。画面に「UCS は2023年5月で更新停止」と出す
- AI の解説は全体で1日10回（IP ごとに3回）。衛星ごとに30日保存し、2回目からは料金がかからない

### できたもの

| 部分 | ファイル |
| --- | --- |
| 軌道計算（共通） | [packages/orbit/src/index.ts](../packages/orbit/src/index.ts) |
| 地球儀（共通。Cesium ion なし） | [packages/globe/src/index.ts](../packages/globe/src/index.ts)、Vite のプラグイン [vite.ts](../packages/globe/src/vite.ts) |
| 軌道要素の配信（2時間に1回だけ取得） | [lib/gp-source.ts](lib/gp-source.ts)、[api/gp.ts](api/gp.ts) |
| 衛星カタログ（種類・国・UCS） | [scripts/build-catalog.ts](scripts/build-catalog.ts)、[lib/category.ts](lib/category.ts)、[lib/owners.ts](lib/owners.ts) |
| 画面 | [src/main.ts](src/main.ts)、位置の計算 [src/worker.ts](src/worker.ts) |
| AI の解説 | [lib/facts.ts](lib/facts.ts)（事実）、[lib/explain.ts](lib/explain.ts)、[api/explain.ts](api/explain.ts) |
| 評価 | [scripts/eval.ts](scripts/eval.ts) → [eval/RESULTS.md](eval/RESULTS.md) |

### 結果（[eval/RESULTS.md](eval/RESULTS.md)）

- **位置のずれ（ISS）**：NASA の軌道データと比べて、軌道要素の時刻の前後6時間で 1.4〜3.5 km。ほぼ進行方向のずれ（0.5秒ぶん）で、高さと軌道面の向きは 0.3 km 以内。3日後には 21 km に広がる
- **計算の速さ**：16,904機の位置を1回計算するのに 9.8 ms（Node）。Worker で 0.25 秒ごとに計算して補間する
- **描画の速さ**：（ブラウザで確認して記入）
- **種類**：UCS に載っていたのは 4,799 / 16,904 機（28.4%）。Starlink を除くと 37.5%。種類は CelesTrak の分類で 3,285機、名前で約1万3千機（ほとんど Starlink）、UCS で約500機が決まった
- **AI の解説**：代表的な8機（ISS・ひまわり9号・みちびき2号機・GPS・Starlink・Kuiper・遥感・ハッブル）で、解説の数字はすべて事実と一致。1回 約0.005ドル

### ハマったところ

- **座標の変換の間違い**：NASA の ISS のデータは J2000 座標、SGP4 は TEME 座標。歳差の行列の真ん中を Y 軸ではなく X 軸で回していて、ずれが 27km と出た。ずれを「高さ・進行方向・軌道面に垂直」に分けると、垂直方向に ±17km が1周ごとに揺れていて、向きの間違いだと分かった。直すと 3.5km
- **UCS の数字の引用符**：タブ区切りなのに、「,」を含む値だけ `"4,000"` と引用符で囲まれていた。そのまま AI に渡すと、照合で「4」と「000」に分かれて ⚠ が出た（みちびき・遥感）。引用符と桁区切りを外して直った
- **みちびきが「静止軌道」**：1周が約1日なので静止軌道に分類していたが、傾きが 39 度ある。AI が「分類上は静止軌道ですが…少し違います」と書いたので気づき、「傾斜対地同期軌道」を足した
- **Starlink が多すぎて UCS が役に立たない**：UCS は2023年5月で止まっていて、その後の Starlink・Kuiper・千帆などが載っていない。種類は CelesTrak の分類と名前を主にした
- **600倍速で白丸が軌道の輪からずれる**：0.25 秒ごとの計算結果を直線で補間していたので、600倍速（1区間で150秒ぶん進む）では弧の内側を通り、低軌道で最大 22.5km 内側にずれた（輪は毎フレーム正確に計算しているので目立った）。補間した点を、地球の中心からの距離も補間した長さに伸ばすと 2.5km に減った。選んだ1機だけは毎フレーム正確に計算して輪と重ねている
- **CelesTrak の取得制限**：開発中に何度も取ると止められるので、手元では保存したファイルを使い、サーバーだけが2時間に1回取るようにした

### 限界

- 位置のずれを確かめたのは ISS の1機だけ。軌道要素が古い衛星や、軌道を頻繁に変える衛星（Starlink は自動で衝突を避ける）はもっとずれる
- 種類は名前の決まり（STARLINK・ONEWEB など）に頼っている部分がある。名前のない新しい衛星（「2026-123A」など）は「その他」になる
- UCS は2023年5月版のまま。運用者が変わった衛星や、役目を終えた衛星の情報は古い
- AI の解説は、カタログの事実と名前からの一般的な知識だけ。軍事衛星の用途などは「公開情報からはわからない」とする


## 記事を書くときのメモ

Qiita の記事を書くための材料。下書きは [ARTICLE.md](ARTICLE.md) にもある。

### 一言でいうと

今動いている人工衛星 16,904機を、3D の地球儀にリアルタイムで表示する。軌道の計算はブラウザの Worker で、クリックした衛星は Claude が「どこの国の、何のための衛星か」を、カタログの事実と軌道の数字だけから解説する。CelesTrak の取得制限を守るため、軌道要素はサーバーで2時間に1回だけ取って全員で使い回す。

### 見せ場とコードの場所

| 見せ場 | 何を見せるか | コード |
| --- | --- | --- |
| 1万7千機を滑らかに動かす | Worker で 0.25 秒ごとに全機を計算し、そのあいだは毎フレーム補間（中心からの距離も補間して弧に乗せる） | [src/main.ts](src/main.ts#L157)、[L205](src/main.ts#L205)、[src/worker.ts](src/worker.ts) |
| 大量の点 | Cesium の PointPrimitiveCollection に1機1点 | [packages/globe/src/index.ts](../packages/globe/src/index.ts#L44) |
| キーなしの Cesium | ion を使わず、同梱の Natural Earth II。静的ファイルは Vite のプラグインで配る | [packages/globe/src/index.ts](../packages/globe/src/index.ts#L15)、[vite.ts](../packages/globe/src/vite.ts#L22) |
| CelesTrak に優しく | 2時間たつまで取らない。取りに行くのは1人だけ（10分の目印）。失敗したら古いものを返す | [lib/gp-source.ts](lib/gp-source.ts#L27) |
| 今の軌道の輪 | 1周分の位置を、今の地球の向きで変換（地上の軌跡ではなく輪になる） | [packages/orbit/src/index.ts](../packages/orbit/src/index.ts)（`orbitRingEcf`） |
| 種類の決め方 | CelesTrak の分類 → 名前（Starlink など）→ UCS → 名前の残り | [scripts/build-catalog.ts](scripts/build-catalog.ts)、[lib/category.ts](lib/category.ts) |
| AI に渡す事実 | 軌道の数字・同じ種類の数はコードで計算して渡す | [lib/facts.ts](lib/facts.ts) |
| 数字の照合 | 衛星の名前の番号（STARLINK-1008 など）は照合から外す | [lib/explain.ts](lib/explain.ts#L34) |
| 位置の答え合わせ | NASA の ISS データを J2000 → TEME に変え、ずれを3方向に分ける | [packages/orbit/src/index.ts](../packages/orbit/src/index.ts#L197)、[scripts/eval.ts](scripts/eval.ts) |

### 使える数字

| 項目 | 値 | 出どころ |
| --- | --- | --- |
| 稼働中の衛星 | 16,904機（2026-11-23） | CelesTrak active |
| そのうち Starlink | 11,199機（66%） | 同上 |
| 他の通信衛星群 | 1,896機（OneWeb 651・Kuiper 391・千帆 275・国網 261 など） | 同上 |
| 日本の衛星 | 133機 | SATCAT の OWNER=JPN |
| UCS に載っている割合 | 28.4%（Starlink を除くと 37.5%） | [eval/RESULTS.md](eval/RESULTS.md) |
| ISS の位置のずれ | 前後6時間で 1.4〜3.5 km、3日後 21 km | 同上 |
| 全機の計算時間 | 9.8 ms / 回（Node） | 同上 |
| 描画 | （記入する）コマ/秒 | 画面の表示 |
| AI の解説 | 8機すべてで数字が一致。1回 約0.005ドル（約0.8円） | 同上・使用量のログ |
| 配るページの大きさ | CesiumJS 本体 約5MB（gzip 1.4MB）＋同梱ファイル 7.4MB、カタログ 0.5MB・UCS 1.5MB | `pnpm build` |

### AI の振る舞いで面白かった例

- みちびき2号機：こちらの分類が「静止軌道」だったのに対し、「分類上は静止軌道ですが、真上の赤道に止まり続ける衛星とは少し違います」と書いた。それで分類の間違いに気づき、「傾斜対地同期軌道」を足した
- Kuiper（UCS に載っていない）：「名前から衛星インターネット用と推測するにとどまり、細かい用途は公開情報からはわかりません」と、推測と事実を分けた
- 遥感30号（軍事）：UCS の「電子情報収集」までを書き、「これ以上の具体的な任務は、公開情報からはわかりません」とした。一方で、製造元の CAST（中国空間技術研究院）を「科学院系の組織」と書いた。数字の照合では見つからない種類の誤り
- ISS：「ボーイング747ほどの大きさ」と、渡していない一般知識を足したことがある（数字ではないので照合に掛からない）

### ハマったところ

README の「実装メモ > ハマったところ」を参照。記事には「座標の向きの間違いを、ずれを3方向に分けて見つけた」話が一番使える（数字の表がそのまま図になる）。

### 限界

README の「実装メモ > 限界」を参照。

### スクリーンショットの候補

1. 全機表示（Starlink の青い殻が地球を覆う）
2. 「Starlink 以外」：中軌道の測位衛星と、静止軌道の輪が見える
3. 600倍速の GIF：低軌道が流れ、静止軌道が止まって見える
4. ISS を選んで白い軌道の輪と、AI の解説（✓ 付き）
5. みちびきの輪（傾いた8の字の軌道）
6. ISS のずれの表（進行方向だけがずれていく）

### 次にやりたいことの候補

- Day07（通過予測 API）で、同じ `packages/orbit` を使って「今夜 ISS が見える時刻」を出す
- 打ち上げ年でのタイムライン（Starlink が増えていく様子）
- 衛星どうしの接近（コンジャンクション）の表示

### 記事を書くときの注意

- CelesTrak の URL を記事に載せるとき、読者が何度も叩かないよう「キャッシュして2時間に1回まで」と添える
- UCS のファイルはリポジトリに入れていない。記事にも元のファイルを貼らない
- 衛星の数は取得日で変わる（Starlink は毎週増える）。数字には「2026-11-23 時点」と付ける
