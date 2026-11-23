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

// ---------- 1日あたりの回数の上限 ----------

/** 日本時間の日付（上限は日本時間の0時にリセット） */
export const jstDate = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 全体の回数と IP ごとの回数を1増やし、上限を超えていたら利用者向けの日本語の理由を返す（超えていなければ null）。
 * IP はそのまま保存せず、ハッシュにして数える。
 */
export async function dailyLimit(
  store: Store,
  { app, ip, total, perIp }: { app: string; ip: string; total: number; perIp: number },
): Promise<string | null> {
  const day = jstDate();
  const ttl = 60 * 60 * 26;
  const ipCount = await store.incr(`${app}:ip:${day}:${await sha(ip)}`, ttl);
  if (ipCount > perIp) return `1人あたり1日${perIp}回までです。明日またお試しください`;
  const count = await store.incr(`${app}:total:${day}`, ttl);
  if (count > total) return `今日の上限（全体で${total}回）に達しました。日本時間の0時にリセットされます`;
  return null;
}

export { sha as hashKey };
