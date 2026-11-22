// 評価：既存のサーベイ論文の参考文献を正解として、何割を拾えたか（再現率）を測る。
// 使い方: pnpm eval           （取得結果は data/eval-cache/ に保存し、2回目以降は再利用）
//         pnpm eval --fresh   （取り直す）
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findPapers, type FindResult } from "../lib/pipeline.js";
import { getWork, getWorks, searchWorks, type Paper } from "../lib/openalex.js";
import { normalizeTitle, rankByCitations } from "../lib/rank.js";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..");
const cacheDir = join(appDir, "data", "eval-cache");
const fresh = process.argv.includes("--fresh");

// テーマは、サーベイのタイトルをそのまま使わず、人が調べものをするときの短い日本語にした。
// cutoff は arXiv の第1版の公開日（export.arxiv.org で確認）。雑誌版の日付は数か月〜1年遅く、
// それを使うとサーベイが引用しようのない論文まで候補に入ってしまう。
const SURVEYS = [
  { id: "W4389984066", arxiv: "2312.10997", cutoff: "2023-12-18", theme: "大規模言語モデルの検索拡張生成（RAG）" },
  { id: "W4393065402", arxiv: "2308.11432", cutoff: "2023-08-22", theme: "大規模言語モデルを使った自律エージェント" },
  { id: "W4387195417", arxiv: "2209.00796", cutoff: "2022-09-02", theme: "拡散モデル" },
  { id: "W3187418919", arxiv: "2012.12556", cutoff: "2020-12-23", theme: "画像認識のためのVision Transformer" },
  { id: "W4390215524", arxiv: "2312.14925", cutoff: "2023-12-22", theme: "人間のフィードバックによる強化学習（RLHF）" },
];

async function cached<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const file = join(cacheDir, `${name}.json`);
  if (!fresh && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const value = await fn();
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(file, JSON.stringify(value));
  return value;
}

interface Truth {
  title: string;
  date: string;
  ids: Set<string>;
  titles: Set<string>;
}

async function loadTruth(id: string): Promise<Truth> {
  const raw = await cached(`truth-${id}`, async () => {
    const w = await getWork(id, "id,title,publication_date,referenced_works");
    const refs = await getWorks(w.referenced_works);
    return { title: w.title, date: w.publication_date, refs: refs.map((r) => ({ id: r.id, title: r.title })) };
  });
  return {
    title: raw.title,
    date: raw.date,
    ids: new Set(raw.refs.map((r: { id: string }) => r.id.replace("https://openalex.org/", ""))),
    titles: new Set(raw.refs.map((r: { title: string | null }) => normalizeTitle(r.title ?? "")).filter(Boolean)),
  };
}

const isHit = (p: Paper, t: Truth) => t.ids.has(p.id) || t.titles.has(normalizeTitle(p.title));

function score(papers: Paper[], t: Truth, k: number) {
  const top = papers.slice(0, k);
  const hits = top.filter((p) => isHit(p, t)).length;
  return { hits, k: top.length, recall: hits / t.ids.size, precision: top.length ? hits / top.length : 0 };
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const rows: string[] = [];
const summary: Record<string, { recall20: number; precision20: number }[]> = { plain: [], citations: [], ours: [] };
const details: unknown[] = [];

for (const s of SURVEYS) {
  const truth = await loadTruth(s.id);
  const notSurvey = (p: Paper) => p.id !== s.id && normalizeTitle(p.title) !== normalizeTitle(truth.title);

  const found: FindResult = await cached(`find-${s.id}-${s.cutoff}`, () => findPapers(s.theme, { beforeDate: s.cutoff }));
  const ours = found.ranked.filter(notSurvey);
  // 比較1：最初の検索語で OpenAlex を関連度順に検索しただけ
  const plain = (
    await cached(`plain-${s.id}-${s.cutoff}`, () => searchWorks(found.queries[0], { beforeDate: s.cutoff }))
  ).filter(notSurvey);
  // 比較2：同じ候補を、引用数の多い順に並べただけ
  const byCitations = rankByCitations(ours);

  const r = {
    plain20: score(plain, truth, 20),
    cit20: score(byCitations, truth, 20),
    ours20: score(ours, truth, 20),
    ours100: score(ours, truth, 100),
    pool: score(ours, truth, ours.length),
  };
  summary.plain.push({ recall20: r.plain20.recall, precision20: r.plain20.precision });
  summary.citations.push({ recall20: r.cit20.recall, precision20: r.cit20.precision });
  summary.ours.push({ recall20: r.ours20.recall, precision20: r.ours20.precision });
  rows.push(
    `| ${truth.title.slice(0, 50)}（arXiv ${s.arxiv}） | ${s.theme} | ${truth.ids.size} | ` +
      `${r.plain20.hits}/20 | ${r.cit20.hits}/20 | **${r.ours20.hits}/20** | ${r.ours100.hits}/100 | ${r.pool.hits}/${r.pool.k} |`,
  );
  details.push({
    survey: s.id,
    theme: s.theme,
    queries: found.queries,
    candidates: found.candidateCount,
    refs: truth.ids.size,
    ...r,
    ourTop20: ours.slice(0, 20).map((p) => ({ title: p.title, year: p.year, citedBy: p.citedBy, hit: isHit(p, truth) })),
  });
  console.log(`${s.id} ${s.theme}: plain ${r.plain20.hits}/20, citations ${r.cit20.hits}/20, ours ${r.ours20.hits}/20`);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const line = (name: string, key: keyof typeof summary) =>
  `| ${name} | ${pct(mean(summary[key].map((x) => x.precision20)))} | ${pct(mean(summary[key].map((x) => x.recall20)))} |`;

const md = `# 評価結果：論文サーベイの自動化

- 実行日：${new Date().toISOString().slice(0, 10)}
- 正解：既存のサーベイ論文${SURVEYS.length}本の参考文献（OpenAlex の \`referenced_works\`）
- 条件：検索はサーベイの arXiv 第1版の公開日より前の論文に限り、サーベイ自身は除く。テーマはサーベイのタイトルではなく、人が調べるときの短い日本語
- 一致の判定：OpenAlex の ID が同じか、タイトルを正規化して同じなら一致
- 再現性：取得結果は \`data/eval-cache/\` に保存（Git管理外）。\`pnpm eval --fresh\` で取り直す

## 3つの方式の比較（上位20本）

| 方式 | 適合率（20本のうち参考文献に入っていた割合） | 再現率（参考文献のうち拾えた割合） |
| --- | --- | --- |
${line("① OpenAlex を関連度順に検索しただけ", "plain")}
${line("② 候補を引用数の多い順に並べただけ", "citations")}
${line("③ このアプリ（関連度＋1年あたり引用数＋新しさ）", "ours")}

## サーベイごとの結果

| サーベイ | テーマ（入力） | 参考文献数 | ① 上位20 | ② 上位20 | ③ 上位20 | ③ 上位100 | 候補全体 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## 読み方と限界

- 参考文献は1本のサーベイで150〜350本あるので、上位20本で拾えるのは最大でも1〜2割。**再現率より、上位20本の適合率**（出した20本がどれだけ「専門家が引用した論文」か）を主な指標として見る
- 参考文献の一覧は最終版（改訂後）のものなので、第1版より後の論文も含まれる。これらはどの方式でも拾えないので再現率を一律に下げるが、方式どうしの比較には影響しない
- 参考文献に入っていない論文が、関係ない論文とは限らない（サーベイの著者が選ばなかっただけの場合もある）
- 「候補全体」は、検索で集めた候補にそもそも正解が何本含まれていたか（並べ替えで拾える上限）

詳しい結果（上位20本の一覧など）は \`eval/results.json\`。
`;

writeFileSync(join(appDir, "eval", "RESULTS.md"), md);
writeFileSync(join(appDir, "eval", "results.json"), JSON.stringify(details, null, 2));
console.log("eval/RESULTS.md を書きました");
