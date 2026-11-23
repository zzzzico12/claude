---
title: "【AI×オープンデータ Day3】サーバーの置き場所で CO2 は8割減らせる：Ember × Google Cloud × Azure の実測遅延"
tags: [AI, オープンデータ, Claude, クラウド, 脱炭素]
---

<!-- Qiita記事の下書き。Claudeが実装メモと評価結果から下書きした。最後に自分の言葉で仕上げる -->

## 今日作ったもの

場所と要件を選ぶと、電力の CO2 が少ないクラウドのリージョン（Google Cloud・AWS・Azure）を提案する Web アプリです。

（スクリーンショット）

デモ：（公開後に記入）

東京から Web アプリを動かす場合、最寄りの東京リージョン（474 gCO2/kWh）の代わりにニュージーランドのリージョン（96 g）を使うと、電力の CO2 を約8割減らせます。遅延の目安は 5ms から 128ms に増えます。

## 使ったオープンデータ

| データ | 用途 | 提供元・ライセンス |
| --- | --- | --- |
| [Ember Yearly Electricity Data](https://ember-energy.org/data/yearly-electricity-data/) | 国別・米国の州別の電力の CO2 | Ember・CC BY 4.0 |
| [Google Cloud region carbon info](https://github.com/GoogleCloudPlatform/region-carbon-info) | Google Cloud のリージョンごとの公式値（評価の正解） | Google・Apache 2.0 |
| [Azure network round-trip latency statistics](https://learn.microsoft.com/azure/networking/azure-network-latency) | リージョン間の往復時間の実測値 | Microsoft・CC BY 4.0 |
| 各社のリージョン一覧 | 所在地（このアプリで座標を付けた） | Google・AWS・Microsoft |

## 仕組み

（処理の流れの図）

- **CO2**：リージョンのある国（米国は州）の年平均。AWS と Azure は公式値がないので、すべてこの推定で並べる
- **遅延**：近い場所は距離から、遠い場所は Azure の実測値を中継して推定する
- **提案**：遅延の条件を満たすリージョンを CO2 の少ない順に並べ、最寄りと比べた削減率を出す（すべてコード）
- **AI**：提案の理由と注意点を3段落で説明するだけ。数字は渡した値だけを使わせ、コードで照合する

## 工夫したところ

### 1. 料金は扱わない

最初は料金も入れる予定でした。Azure の料金と CO2 の相関を調べると 0.02 でほぼ無関係だったので、「CO2 に配慮して選ぶ」ことに絞りました。

### 2. 遅延は実測値で補正する

（距離だけだと東京〜スウェーデンが110ms、実測は253ms、の話）

### 3. 推定の正しさを、公式値で確かめる

## ハマったところ

- 距離だけの遅延の推定で、東京から Web アプリ向けに北欧が1位に出た
- 中継点を使ったら、近距離がかえって外れた
- Ember の CSV の URL が変わっていた

## どれくらいうまくいったか

**CO2**：Google Cloud の44リージョンで、Ember からの推定値と公式値を比べました（2024年）。

| | 誤差率の中央値 | 順位の相関 | CO2 の少ない上位10の一致 |
| --- | --- | --- | --- |
| 推定（米国は州単位） | 33% | 0.89 | 9 / 10 |

値は3割ほどずれますが、「どこが少ないか」の並びはよく合いました。

**遅延**：Azure の実測値（902組）と比べました。推定には、その2つのリージョン自身の実測値は使っていません。

| | 誤差の中央値 | 「150ms以内か」の判定の一致 |
| --- | --- | --- |
| 距離だけ | 18 ms | 78% |
| 中継点つき（このアプリ） | 13 ms | 89% |

限界：CO2 は年平均で、時間帯や国の中の送電網の違い（東京と大阪など）は反映しません。各社の再エネ購入（PPA）も含みません。

## まとめと次にやりたいこと

<!-- ここは自分の言葉で一言 -->

## 出典

- Ember, Yearly Electricity Data（CC BY 4.0）
- Google Cloud, region-carbon-info（Apache 2.0）
- Microsoft, Azure network round-trip latency statistics（CC BY 4.0）
- 地図：© OpenStreetMap contributors
