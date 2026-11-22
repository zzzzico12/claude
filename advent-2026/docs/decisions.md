# 決めること・決めたこと

決めたら、日付と理由を書いて残す。

## 未決定

- [ ] **アプリの中で使うClaudeのモデル**：品質と料金のバランス
- [ ] **ドメインとURLの形**：当面は Vercel の既定URL（`<プロジェクト名>.vercel.app`）。独自ドメインにするかは後で決める
- [ ] **月の予算の上限**：Claude APIと各サービスの利用料

## 決定済み

- 2026-11-21：25本の題材と日付を確定（docs/plan.md）
- 2026-11-21：去年のリポジトリ（zzzzico12/claude）と同じく、`apps/<アプリ名>/` で1アプリ1フォルダに分ける。共通部品は `packages/` に置く
- 2026-11-21：**リポジトリ**は新しく作らず、去年と同じ `zzzzico12/claude` の `advent-2026/` に置く。理由：去年のアプリと並べて見せられる。独自の `packages/` とワークスペースを持つので、ルートの `apps/` には混ぜない。ブランチ名は `advent/<アプリ名>`、Issueのラベルは `advent-2026`。CI（`.github/workflows/advent-2026-ci.yml`）は `advent-2026/` に変更があったときだけ動く
- 2026-11-21：**デプロイ先**は Vercel。理由：camera-translator で Vercel Functions を使ってキーを隠す実績がある。1アプリ1プロジェクトにして、Root Directory を `advent-2026/apps/<アプリ名>` にし、そのフォルダ（と `packages/`）に変更がないときはビルドしない設定にする。Hobby プランは非商用に限られるが、広告を付けない方針と合う
- 2026-11-21：**APIキーを隠す場所**は、各アプリの `api/` に置く Vercel Functions。キーは Vercel プロジェクトの環境変数に入れる
- 2026-11-22：**回数の上限とキャッシュの保存先**は Upstash Redis（Vercel の Marketplace から追加。無料枠）。理由：Vercel Functions はインスタンスが入れ替わるので、メモリでは回数を保てない。Day02 以降の公開デモでも使い回す。環境変数 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`（または `KV_REST_API_URL` / `KV_REST_API_TOKEN`）があれば自動で使い、なければメモリ（手元の開発用）
- 2026-11-22：**公開デモの上限**は、Day01 で全体1日10回・IPごと3回（Sonnet 5.5 で1回約10円）
- 2026-11-21：**pnpm** は 9.15.0（`package.json` の `packageManager`）。Node 25 には corepack が付いていないので、手元では `npm i -g pnpm@9.15.0` で入れる
