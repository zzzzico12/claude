// 評価：地域ごとの数字と「その年に何があったか」の説明
//   pnpm eval:events      （AI は呼ばない。出典のリンクには1件ずつ間をあけて問い合わせる）
// 1. 地域の合計が世界の合計と一致するか（振り分け漏れがないか）
// 2. 説明に出典が付いているか、文中の数字が集計か出典の文と一致したか
// 3. 出典のリンクが実在するか（HTTP で取得できるか）
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const stats = JSON.parse(readFileSync(join(appDir, "public", "data", "stats.json"), "utf8"));
const events = JSON.parse(readFileSync(join(appDir, "public", "data", "events.json"), "utf8")) as {
  groupName: string;
  year: number;
  kind: string;
  citations: { url: string; title: string }[];
  unmatchedNumbers: string[];
}[];
const UA = "advent-2026-forest-change (https://github.com/zzzzico12/claude)";

async function reachable(url: string): Promise<number> {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, { method, redirect: "follow", headers: { "User-Agent": UA } });
      if (res.status < 400 || method === "GET") return res.status;
    } catch {
      if (method === "GET") return 0;
    }
  }
  return 0;
}

async function main() {
  // 1. 合計
  const keys = Object.keys(stats.groups);
  const sumGroups = keys.reduce((s, k) => s + stats.groups[k].loss.reduce((a: number, b: number) => a + b, 0), 0);
  const sumWorld = stats.world.loss.reduce((a: number, b: number) => a + b, 0);

  // 2. 出典と数字
  const withCitations = events.filter((e) => e.citations.length > 0).length;
  const clean = events.filter((e) => e.unmatchedNumbers.length === 0).length;

  // 3. リンク
  const urls = [...new Set(events.flatMap((e) => e.citations.map((c) => c.url)))];
  const status = new Map<string, number>();
  for (const u of urls) {
    status.set(u, await reachable(u));
    await new Promise((r) => setTimeout(r, 1000));
  }
  const ok = [...status.values()].filter((s) => s >= 200 && s < 400).length;
  const blocked = [...status.entries()].filter(([, s]) => s === 401 || s === 403 || s === 429);
  const broken = [...status.entries()].filter(([, s]) => s === 0 || s === 404 || s === 410 || s >= 500);

  const md = `# 評価結果：地域ごとの数字と「その年に何があったか」

- 実行日：${new Date().toISOString().slice(0, 10)}
- データ：${stats.source.dataset}（${stats.source.version}）。樹冠の割合${stats.source.threshold}%以上
- 再現：\`uv run python scripts/fetch_stats.py && pnpm events && pnpm eval:events\`

## 1. 地域の合計

- 7つの地域の合計：${(sumGroups / 1e6).toFixed(2)} 百万 ha、世界の合計：${(sumWorld / 1e6).toFixed(2)} 百万 ha（${Math.abs(sumGroups - sumWorld) / sumWorld < 1e-6 ? "一致（年ごとの値を ha 単位に丸めた差を除く）" : "不一致"}）
- 大陸に振り分けられなかった国：${stats.unmapped.countries.length} か国（減少面積の ${(stats.unmapped.share * 100).toFixed(3)}%）

## 2. 説明の出典と数字

| 項目 | 結果 |
| --- | --- |
| 説明の数 | ${events.length}（7地域 × 減少が最も多かった年・前の年から最も増えた年） |
| 出典（ウェブ検索の結果からの引用）が付いた説明 | ${withCitations} / ${events.length} |
| 文中の数字が、すべて集計か出典の文と一致した説明 | ${clean} / ${events.length} |

一致しなかった数字（画面にも ⚠ で表示している）：

${events.filter((e) => e.unmatchedNumbers.length).map((e) => `- ${e.groupName} ${e.year}年：${e.unmatchedNumbers.join("、")}`).join("\n") || "- なし"}

## 3. 出典のリンク

- 出典の数（重複を除く）：${urls.length}
- 取得できた（HTTP 2xx・3xx）：${ok} / ${urls.length}
- 自動の取得を断られた（401・403・429。ブラウザでは開ける可能性がある）：${blocked.length}${blocked.length ? `（${blocked.map(([u, s]) => `${s} ${new URL(u).host}`).join("、")}）` : ""}
- 見つからない・つながらない（404・410・5xx・接続できない）：${broken.length}${broken.length ? `（${broken.map(([u, s]) => `${s} ${u}`).join("、")}）` : ""}

## 読み方と限界

- 数字の照合は「同じ数字が、集計か出典の文のどこかにあるか」までで、文の意味が正しいかは確かめていない
- 出典が付いていても、その出典が文の内容を本当に支えているかは、人が確かめる必要がある
- 年の選び方（最も多かった年・前の年から最も増えた年）は機械的なもので、「その地域で最も重要な出来事」とは限らない
`;
  writeFileSync(join(appDir, "eval", "EVENTS.md"), md);
  console.log(md.split("## 読み方")[0]);
}

main();
