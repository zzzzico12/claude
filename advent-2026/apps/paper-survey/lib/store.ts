// 回数の上限とキャッシュの保存先。
// - Upstash Redis（REST）の環境変数があればそれを使う（Vercel の Marketplace で追加すると自動で入る）
// - なければメモリ（手元の開発用。Vercel ではインスタンスごとに消えるので、本番では使わない）

export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  /** 1 増やして新しい値を返す。初めてのキーには有効期限を付ける */
  incr(key: string, ttlSec: number): Promise<number>;
}

class MemoryStore implements Store {
  private data = new Map<string, { value: string; expires: number }>();
  async get(key: string) {
    const e = this.data.get(key);
    if (!e || e.expires < Date.now()) return null;
    return e.value;
  }
  async set(key: string, value: string, ttlSec: number) {
    this.data.set(key, { value, expires: Date.now() + ttlSec * 1000 });
  }
  async incr(key: string, ttlSec: number) {
    const n = Number((await this.get(key)) ?? 0) + 1;
    const prev = this.data.get(key);
    this.data.set(key, { value: String(n), expires: prev && prev.expires > Date.now() ? prev.expires : Date.now() + ttlSec * 1000 });
    return n;
  }
}

class UpstashStore implements Store {
  constructor(
    private url: string,
    private token: string,
  ) {}
  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands.map((c) => c.map(String))),
    });
    if (!res.ok) throw new Error(`Upstash が HTTP ${res.status} を返しました`);
    const data = (await res.json()) as { result?: unknown; error?: string }[];
    return data.map((d) => {
      if (d.error) throw new Error(`Upstash: ${d.error}`);
      return d.result;
    });
  }
  async get(key: string) {
    const [v] = await this.pipeline([["GET", key]]);
    return (v as string | null) ?? null;
  }
  async set(key: string, value: string, ttlSec: number) {
    await this.pipeline([["SET", key, value, "EX", ttlSec]]);
  }
  async incr(key: string, ttlSec: number) {
    // NX：有効期限がまだないときだけ付ける（数えるたびに期限が延びないように）
    const [n] = await this.pipeline([["INCR", key], ["EXPIRE", key, ttlSec, "NX"]]);
    return Number(n);
  }
}

let store: Store | undefined;
export function getStore(): Store {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  store = url && token ? new UpstashStore(url, token) : new MemoryStore();
  return store;
}

export const isPersistentStore = () =>
  Boolean((process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN));
