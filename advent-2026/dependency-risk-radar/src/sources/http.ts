// データ提供元への問い合わせ。混雑時は少し待って2回までやり直し、同時に投げる数を抑える。
const UA = "dependency-risk-radar (https://github.com/zzzzico12/claude/tree/main/advent-2026/dependency-risk-radar)";

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init?.headers } });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 404) return null;
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    throw new Error(`${new URL(url).host} が HTTP ${res.status} を返しました`);
  }
}

/** 同時実行数を limit に抑えて、items を順に処理する */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}
