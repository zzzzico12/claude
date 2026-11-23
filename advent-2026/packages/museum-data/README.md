# packages/museum-data：美術館の作品データ

- **使う日**：名画の配色（12/4）、中を歩く（12/13）、似ている作品（12/14）、実物大（12/19）
- **役割**：美術館の API から作品を取り、題名・作者・年・実寸・画像 URL・ライセンス・クレジットを同じ形（`Artwork`）にそろえる

| 美術館 | データ | 画像 |
| --- | --- | --- |
| シカゴ美術館（AIC） | ✅ API（CC0） | ✅ IIIF（`AIC-User-Agent` ヘッダーでアプリ名を名乗る） |
| メトロポリタン美術館（Met） | ✅ API（CC0） | ❌ 画像サーバーがプログラムからの取得をボット確認で止めている（2026-11-23 確認）。ブラウザのふりをして回避はしない |

```ts
import { fetchImage, getAicArtwork, searchAic } from "@advent/museum-data";

const art = await getAicArtwork(20684);          // カイユボット「パリの通り、雨」
const jpeg = await fetchImage(art.imageUrl!(400)); // 幅400pxの画像
const found = await searchAic("water lilies", 5); // パブリックドメインで画像のあるものだけ
```
