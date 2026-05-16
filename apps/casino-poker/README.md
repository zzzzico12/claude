# SMASH POKER – Fighter's Table ♠️

スマブラ風 UI で遊ぶ本格テキサスホールデムポーカー。チップ損失をダメージ%で表現し、ALL IN 決着時には FINAL SMASH が炸裂する。

**[▶ 遊んでみる](https://zzzzico12.github.io/claude/apps/casino-poker/smash.html)**

---

## 遊び方

1. **START** ボタンでゲーム開始
2. 手札2枚 + コミュニティカード5枚で最強の5枚を作る
3. 下部 HUD でアクションを選択
   - **FOLD** — 降りる
   - **CHECK** — パス（ベットなし時のみ）
   - **CALL** — コール
   - **RAISE** — レイズ（スライダーで金額調整）
   - **ALL IN** — 全賭け → **FINAL SMASH!!** 発動
4. チップが0になったら **KO!!** → ゲームオーバー
5. 全員を KO にすれば勝利

---

## SMASH 演出

| 演出 | 発生条件 |
|---|---|
| ダメージ% | 各プレイヤーの総ベット額をスマブラ式 % 表示 |
| SMASH!! | ラウンド勝利時にヒットエフェクト |
| KO!! | チップ切れで脱落 |
| **FINAL SMASH!!!** | ALL IN で勝利したとき全画面エフェクト |

---

## AI ファイター

| ファイター | アイコン | スタイル |
|---|---|---|
| YOU | 😎 | プレイヤー |
| VICTOR | 🎩 | アグレッシブ（ブラフ多め） |
| BLAKE | 🕵️ | パッシブ（慎重） |
| MORGAN | 💼 | バランス型 |
| SCARLET | 🦊 | 最もアグレッシブ（ブラフ率高） |

AI は手役強度・ポットオッズ・各キャラクターの攻撃性パラメータを組み合わせて行動を決定する。

---

## ルール

- **形式**: テキサスホールデム（5人卓）
- **初期チップ**: $1,000
- **ブラインド**: SB $10 / BB $20
- **ステージ**: PREFLOP → FLOP → TURN → RIVER → SHOWDOWN
- **脱落**: チップ 0 で KO。最後の1人が残れば勝利

---

## 技術スタック

| 用途 | 技術 |
|---|---|
| ゲームロジック | HTML5, JavaScript (Vanilla) |
| 3D背景エフェクト | Three.js |
| アニメーション | CSS3 Animations, Canvas API |
| フォント | Bungee, Rajdhani (Google Fonts) |
| オフライン対応 | Service Worker (PWA) |

---

## ローカルで動かす

```bash
# ルートディレクトリで
python3 -m http.server 8732
# → http://localhost:8732/apps/casino-poker/smash.html
```

---

## PWA インストール

ブラウザの「ホーム画面に追加」でアプリとしてインストール可能（フルスクリーン起動）。
