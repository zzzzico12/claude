# packages/orbit：軌道計算

- **使う日**：人工衛星（12/6）、通過予測（12/7）
- **役割**：satellite.js（SGP4）で、CelesTrak の GP データ（OMM の JSON）から位置を計算する

## 使い方

- `fetchGroup(group, userAgent)`：CelesTrak から取得する。大きなグループ（active・starlink）は取得回数が制限されているので、**呼び出す側で必ずキャッシュする**（約2時間ごとの更新より頻繁に取らない）。Day06 の `lib/gp-source.ts` が例
- `compactGp` / `expandGp`：計算に要る項目だけの表の形にする・戻す（1万7千機で 7MB → 約2MB）
- `toSatrec(gp)`、`positionsEcf(satrecs, date, out)`：まとめて位置を計算（地球に固定した座標、km）
- `geodetic(satrec, date)`：緯度・経度・高さ
- `orbitSummary(gp)`：1周の時間・高さ・傾き・軌道の区分（低軌道・中軌道・静止軌道・長楕円軌道）
- 答え合わせ用：`parseOem`（NASA の ISS 軌道データ）、`j2000ToTeme`（J2000 → SGP4 の座標 TEME。歳差と章動の大きい項）

## ハマったところ

- J2000 → TEME の歳差の行列で、真ん中の回転を Y 軸ではなく X 軸にしていて、ISS のずれが 27km と出た。ずれを進行方向・軌道面の垂直方向・高さの3つに分けると、垂直方向に ±17km が1周ごとに揺れていて、座標の向きの間違いだと分かった（直すと 3.5km、ほぼ進行方向だけ）。テストを追加済み
