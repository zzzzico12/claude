# らくがき3D ✨

子どもの落書き写真を3Dキャラクターにして、草原の3Dワールドを歩き回らせるアプリ。

**[▶ 遊んでみる](https://zzzzico12.github.io/claude/apps/rakugaki-3d/rakugaki-3d.html)**

---

## 使い方

1. **写真を撮る or 選ぶ** — カメラ撮影・ギャラリー選択・ドラッグ＆ドロップに対応
2. **背景除去** — AIが自動でキャラクターだけ切り抜き
3. **モードを選ぶ**
   - 🔮 **ぷっくり3D** — 深度マップでリアルな立体感
   - ✨ **ペーパーモード (2.5D)** — Paper Mario風のスプライト表示
4. **タップでジャンプ！** — 草原を歩き回るキャラクターを楽しむ

---

## 機能

- **AI背景除去** (`@imgly/background-removal`) — ブラウザ内WASMで動作、サーバー不要
- **ぷっくり3D** — Three.js `displacementMap` に深度マップを適用、160×160セグメントで滑らかな立体感
- **AI深度推定** (オプション) — HF Token設定時に `depth-anything/Depth-Anything-V2-Small-hf` でセマンティック深度を計算
- **3Dワールド** — 草地・木・花・雲・太陽・影・パーティクルエフェクト
- **ジャンプ物理演算** — タップ/クリックで放物線ジャンプ
- **スクリーンショット** — PNG保存ボタン

---

## 技術スタック

| 用途 | 技術 |
|---|---|
| 3Dレンダリング | Three.js r163 (ES Modules / jsDelivr CDN) |
| 背景除去 | @imgly/background-removal@1.7.0 (WASM) |
| AI深度推定 | HuggingFace Inference API (Depth-Anything-V2-Small) |
| WASM推論 | onnxruntime-web@1.21.0 |
| ホスティング | GitHub Pages (静的HTML 1ファイル) |

---

## HF Token（任意）

HuggingFaceのアクセストークンを設定するとAI深度推定が有効になり、3Dのぷっくり感が向上します。

- [hf.co/settings/tokens](https://huggingface.co/settings/tokens) で無料取得
- `⚙️ HF Token` から入力・保存（`localStorage` に保存、サーバー送信なし）
- トークンなしでもアルファブラー方式で動作

---

## セキュリティ

- **CSP** — `default-src 'none'` ベースで最小権限。外部接続先を `cdn.jsdelivr.net` と `api-inference.huggingface.co` のみに限定
- **WASM** — `wasm-unsafe-eval` で WebAssembly 実行を許可（ONNX推論に必要）
- **ファイル検証** — MIME タイプ・ファイルサイズ（15MB上限）をクライアント側で検証
- **トークン検証** — `hf_` プレフィックス＋正規表現でフォーマット検証
- **XSS対策** — ユーザー入力はすべて `textContent` で表示（`innerHTML` 不使用）
- **外部リンク** — `rel="noopener noreferrer"` 設定済み
- **リファラ** — `no-referrer` ポリシーで外部サイトへのリファラを遮断

---

## ローカルで動かす

```bash
# HTTPサーバーが必要（file://では外部CDNがCORSブロックされる）
python3 -m http.server 8732
# → http://localhost:8732/apps/rakugaki-3d/rakugaki-3d.html
```

---

## フォールバック動作

| 状況 | 動作 |
|---|---|
| @imgly WASM失敗 | Canvas閾値法で白背景を除去 |
| HF Token未設定 | アルファチャンネルブラーで深度マップを生成 |
| HF API 503 | 最大5回リトライ（estimated_timeで待機） |
| 3D初期化失敗 | 自動的に2.5Dモードへ切り替え |
