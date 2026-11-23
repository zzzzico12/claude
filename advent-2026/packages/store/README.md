# packages/store：回数の上限とキャッシュの保存先

- **使う日**：公開デモで AI を呼ぶ日（Day01 論文サーベイ、Day03 リージョン選びなど）
- **役割**：`get` / `set`（有効期限つき）/ `incr`（数える）の3つだけの小さな保存先
  - Upstash Redis（REST）の環境変数（`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`、または Vercel の連携で入る `KV_REST_API_URL` / `KV_REST_API_TOKEN`）があればそれを使う
  - なければメモリ（手元の開発用。Vercel ではインスタンスごとに消えるので本番では使わない）
- **`dailyLimit`**：「全体で1日N回・IPごとにM回」の上限をまとめて判定する（日本時間の0時にリセット。IP はハッシュにして保存）

```ts
import { dailyLimit, getStore } from "@advent/store";

const store = getStore();
const limited = await dailyLimit(store, { app: "paper-survey", ip, total: 10, perIp: 3 });
if (limited) return new Response(JSON.stringify({ error: limited }), { status: 429 });
```
