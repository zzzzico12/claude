# packages/globe：3Dの地球儀

- **使う日**：人工衛星（12/6）、通過予測（12/7）、ボイジャー（12/10）、風船（12/17）、サンタ（12/25）
- **役割**：CesiumJS の3D地球儀をラップする。点・線・軌跡・時間アニメーションを共通の形で渡せるようにする

## 使い方

```ts
// vite.config.ts
import { cesiumAssets } from "@advent/globe/vite";
export default defineConfig({ plugins: [cesiumAssets(__dirname)] });

// 画面（Cesium を読み込む前に設定する）
(window as any).CESIUM_BASE_URL = "/cesium/";
const { createGlobe, PointCloud } = await import("@advent/globe");
import "cesium/Build/Cesium/Widgets/widgets.css";
```

- `createGlobe(el)`：Cesium ion（トークンが要るサービス）を使わない地球儀。地図は CesiumJS に同梱の Natural Earth II（パブリックドメイン）
- `PointCloud`：位置が毎フレーム変わる大量の点（ECEF の km で渡す）
- `cesiumAssets()`：CesiumJS の静的ファイル（Workers・Assets など）を開発サーバーで配り、ビルドで `dist/cesium/` に写す Vite のプラグイン
