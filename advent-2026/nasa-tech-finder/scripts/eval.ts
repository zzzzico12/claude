// 評価：テスト用の課題20問（eval/questions.json）で、上位に出た技術が課題に関係あるかを採点する（pnpm eval）
// - 比べるもの
//   特許：ベクトルの近さの上位5件 ／ キーワード検索（T2 の検索に Claude の検索語を入れる）の上位5件
//   報告書：並べ直したあとの上位5件 ／ NTRS が返した順の上位5件
//   AI が選んだもの（最大5件）
// - 採点は Claude（課題ごとに1回、候補をまとめて 0・1・2 で採点）。人の確認の代わりに、2割を別のモデル（Opus 5.5・深く考える設定）が
//   最初の採点を見ずに採点し直し、一致の割合を出す（`pnpm eval --reuse --recheck`。eval/judgments.csv の「再確認」欄）
// - Voyage の無料の制限に合わせて課題ごとに40秒あけるので、20問で20分ほどかかる
// - 1回目の結果は data/eval-run.json に保存し、`pnpm eval --reuse` で API を呼ばずに表だけ作り直せる
import { generateObject } from "@advent/ai";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { loadIndex } from "../lib/index-file.js";
import { searchT2, type Patent } from "../lib/patents.js";
import { explain, findCandidates, understand, verify, type Explanation } from "../lib/search.js";
import { writeJudgments } from "./judgments-csv.js";

const TOP = 5;
/** 再確認に使うモデル（最初の採点とは別のモデルにする） */
const RECHECK_MODEL = "claude-opus-5-5";
const RUN = "data/eval-run.json";
const questions = JSON.parse(readFileSync("eval/questions.json", "utf8")) as { id: string; problem: string; area: string }[];

interface Item {
  id: string;
  kind: "patent" | "report";
  title: string;
  text: string;
}
interface RunRow {
  q: (typeof questions)[number];
  notTechnical: boolean;
  queries: string[];
  vectorPatents: string[];
  keywordPatents: string[];
  rerankedReports: string[];
  rawReports: string[];
  picks: string[];
  explanation: Explanation | null;
  unmatchedNumbers: string[];
  items: Item[];
  judged: Record<string, { score: 0 | 1 | 2; reason: string }>;
  /** 別のモデルによる再確認（抜き取りの候補だけ） */
  rechecked?: Record<string, { score: 0 | 1 | 2; reason: string }>;
  ms: number;
}

const JudgeSchema = z.object({
  judgments: z.array(z.object({ id: z.string(), score: z.union([z.literal(0), z.literal(1), z.literal(2)]), reason: z.string() })),
});
const JUDGE_SYSTEM = `あなたは技術調査の審査員です。課題と、NASA の特許・技術報告書の候補を見て、候補ごとに課題との関係を採点します。
- 2：課題の解決に直接使えそう（課題が求める機能そのものの技術）
- 1：一部に使える、または近い分野で参考になる
- 0：関係ない
候補の説明文に書いてあることだけで判断し、甘くつけない。reason は日本語で1文。すべての候補の id を1回ずつ採点する。`;

async function judge(problem: string, items: Item[], opts: { model?: string; effort?: "medium" | "high" } = {}) {
  const r = await generateObject({
    label: "nasa-tech-finder/eval-judge",
    model: opts.model,
    system: JUDGE_SYSTEM,
    prompt: `課題：${problem}\n\n候補：\n${JSON.stringify(items.map((x) => ({ id: x.id, title: x.title, text: x.text.slice(0, 1200) })), null, 1)}`,
    schema: JudgeSchema,
    effort: opts.effort ?? "medium",
    maxTokens: 12000,
  });
  return Object.fromEntries(r.judgments.map((j) => [j.id, { score: j.score, reason: j.reason }]));
}

/** キーワード検索の比較用：Claude の検索語で T2 を検索し、出た順に重複を除いて上位 TOP 件 */
async function keywordPatents(queries: string[]): Promise<Patent[]> {
  const seen = new Map<string, Patent>();
  for (const q of queries) {
    for (const p of await searchT2(q)) if (!seen.has(p.id)) seen.set(p.id, p);
    await new Promise((r) => setTimeout(r, 1000));
    if (seen.size >= TOP * 3) break;
  }
  // 1つ目の語の結果を優先しつつ、各語の上位を混ぜる（出た順）
  return [...seen.values()].slice(0, TOP);
}

async function run(): Promise<RunRow[]> {
  const index = loadIndex();
  if (!index) throw new Error("server-data/index.json がありません。先に pnpm index を動かしてください");
  const rows: RunRow[] = [];
  for (const q of questions) {
    const t0 = Date.now();
    const need = await understand(q.problem);
    const c = await findCandidates(index, q.problem, need);
    const ex = need.notTechnical ? null : await explain(q.problem, c);
    const ms = Date.now() - t0;
    const kw = await keywordPatents(need.queries);
    const items = new Map<string, Item>();
    const addP = (p: Patent) => items.set(p.id, { id: p.id, kind: "patent", title: p.title, text: p.description });
    c.patents.slice(0, TOP).forEach((s) => addP(s.item));
    kw.forEach(addP);
    for (const r of [...c.reports.slice(0, TOP).map((s) => s.item), ...c.reportsRaw.slice(0, TOP)]) items.set(r.id, { id: r.id, kind: "report", title: r.title, text: r.abstract });
    const judged = items.size ? await judge(q.problem, [...items.values()]) : {};
    rows.push({
      q,
      notTechnical: need.notTechnical,
      queries: need.queries,
      vectorPatents: c.patents.slice(0, TOP).map((s) => s.item.id),
      keywordPatents: kw.map((p) => p.id),
      rerankedReports: c.reports.slice(0, TOP).map((s) => s.item.id),
      rawReports: c.reportsRaw.slice(0, TOP).map((r) => r.id),
      picks: ex?.explanation.picks.map((p) => p.id) ?? [],
      explanation: ex?.explanation ?? null,
      unmatchedNumbers: ex?.unmatchedNumbers ?? [],
      items: [...items.values()],
      judged,
      ms,
    });
    console.log(`${q.id} ${q.problem}：AI が選んだ ${rows.at(-1)!.picks.length}件、${(ms / 1000).toFixed(1)}秒`);
    // Voyage の無料の制限（1分に3回・1万トークン）に合わせて、課題ごとに間をあける
    await new Promise((r) => setTimeout(r, 40_000));
  }
  writeFileSync(RUN, JSON.stringify(rows, null, 1));
  return rows;
}

const rows = process.argv.includes("--reuse") && existsSync(RUN) ? (JSON.parse(readFileSync(RUN, "utf8")) as RunRow[]) : await run();
// 数字の照合は、照合のしかたを直したときにやり直せるよう、保存した説明と候補からもう一度計算する
for (const r of rows) if (r.explanation) r.unmatchedNumbers = verify(r.q.problem, r.explanation, r.items).unmatchedNumbers;

// 抜き取り：判定した候補の2割（決まった順で選ぶので、やり直しても同じものが選ばれる）
const all = rows.flatMap((r) => r.items.map((it) => ({ r, it })));
const sample = new Set(all.filter((_, i) => i % 5 === 2).map(({ r, it }) => `${r.q.id}:${it.id}`));

// 再確認：抜き取りの候補を、別のモデルが最初の採点を見ずに採点し直す
if (process.argv.includes("--recheck")) {
  for (const r of rows) {
    const items = r.items.filter((it) => sample.has(`${r.q.id}:${it.id}`));
    if (!items.length) continue;
    r.rechecked = await judge(r.q.problem, items, { model: RECHECK_MODEL, effort: "high" });
    console.log(`${r.q.id}：${items.length}件を再確認`);
  }
  writeFileSync(RUN, JSON.stringify(rows, null, 1));
}

// ---------- 集計 ----------
const scoreOf = (r: RunRow, id: string) => r.judged[id]?.score ?? 0;
/** 上位 TOP 件のうち、score が min 以上の割合（件数が TOP に足りなくても分母は TOP） */
const precision = (r: RunRow, ids: string[], min: number) => ids.slice(0, TOP).filter((id) => scoreOf(r, id) >= min).length / TOP;
const technical = rows.filter((r) => r.q.area.startsWith("対象外") === false);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const methods: [string, (r: RunRow) => string[]][] = [
  ["特許：ベクトルの近さ（このアプリ）", (r) => r.vectorPatents],
  ["特許：キーワード検索（T2 の検索）", (r) => r.keywordPatents],
  ["報告書：並べ直したあと（このアプリ）", (r) => r.rerankedReports],
  ["報告書：NTRS が返した順", (r) => r.rawReports],
];
const pickPrecision = (r: RunRow, min: number) => (r.picks.length ? r.picks.filter((id) => scoreOf(r, id) >= min).length / r.picks.length : null);
const pickVals = (min: number) => technical.map((r) => pickPrecision(r, min)).filter((x): x is number => x !== null);

writeJudgments(
  all.map(({ r, it }) => {
    const re = r.rechecked?.[it.id];
    return [r.q.id, r.q.problem, it.kind === "patent" ? "特許" : "報告書", it.id, it.title, String(scoreOf(r, it.id)), r.judged[it.id]?.reason ?? "", sample.has(`${r.q.id}:${it.id}`) ? "○" : "", re ? String(re.score) : "", re?.reason ?? ""];
  }),
);

// 最初の採点と再確認の一致
const agree = all.flatMap(({ r, it }) => {
  const re = r.rechecked?.[it.id];
  return re ? [{ c: scoreOf(r, it.id), h: re.score as number, q: r.q.id, id: it.id }] : [];
});

const date = new Date().toISOString().slice(0, 10);
const lines: string[] = [];
lines.push(`# Day 08 の評価結果`, ``, `- 日付：${date}`, `- 課題：${rows.length}問（うち関係する技術がないはずの問題 ${rows.length - technical.length}問）。\`eval/questions.json\``);
lines.push(`- 採点：Claude（${process.env.CLAUDE_MODEL ?? "既定のモデル"}）が候補ごとに 0（関係ない）・1（一部に使える）・2（直接使えそう）。2割を別のモデル（${RECHECK_MODEL}）が採点し直して確かめる（\`eval/judgments.csv\`）`);
lines.push(`- 上位${TOP}件の「関係あり」の割合を、${technical.length}問の平均で示す。件数が${TOP}件に足りないときも分母は${TOP}`, ``);
lines.push(`## 1. 上位${TOP}件のうち関係ある割合`, ``, `| 方法 | 1以上（一部に使える以上） | 2（直接使えそう） |`, `| --- | --- | --- |`);
for (const [name, f] of methods) lines.push(`| ${name} | ${pct(avg(technical.map((r) => precision(r, f(r), 1))))} | ${pct(avg(technical.map((r) => precision(r, f(r), 2))))} |`);
lines.push(`| AI が選んだもの（平均 ${avg(technical.map((r) => r.picks.length)).toFixed(1)}件。選んだ件数が分母） | ${pct(avg(pickVals(1)))} | ${pct(avg(pickVals(2)))} |`, ``);

lines.push(`## 2. 課題ごと`, ``, `| ID | 課題 | 特許（ベクトル） | 特許（キーワード） | 報告書（並べ直し） | 報告書（NTRS の順） | AI が選んだ（関係あり／件数） | 時間 |`, `| --- | --- | --- | --- | --- | --- | --- | --- |`);
for (const r of rows) {
  const p = (ids: string[]) => `${ids.slice(0, TOP).filter((id) => scoreOf(r, id) >= 1).length}/${TOP}`;
  lines.push(`| ${r.q.id} | ${r.q.problem} | ${p(r.vectorPatents)} | ${p(r.keywordPatents)} | ${p(r.rerankedReports)} | ${p(r.rawReports)} | ${r.picks.filter((id) => scoreOf(r, id) >= 1).length}/${r.picks.length} | ${(r.ms / 1000).toFixed(1)}秒 |`);
}
lines.push(``, `数字は「上位${TOP}件のうち、採点が1以上の件数」。時間は課題を読む→探す→説明する、までの合計（キーワード検索と採点は含まない）。`, ``);

const ood = rows.filter((r) => !technical.includes(r));
lines.push(`## 3. 関係する技術がないはずの問題`, ``);
for (const r of ood) lines.push(`- ${r.q.id}「${r.q.problem}」：${r.notTechnical ? "AI が「技術の課題ではない」と判断して探さなかった" : `AI が選んだのは ${r.picks.length}件（${r.picks.map((id) => `${id}=${scoreOf(r, id)}`).join("、") || "なし"}）。まとめ：「${r.explanation?.overview ?? ""}」`}`);
lines.push(``);

lines.push(`## 4. AI の説明の照合`, ``);
const unmatched = rows.flatMap((r) => r.unmatchedNumbers.map((n) => `${r.q.id}：${n}`));
lines.push(`- 候補の説明文と照合できなかった数字：${unmatched.length ? unmatched.join("、") : "なし"}`);
lines.push(`- 候補にない ID を挙げた回数：コードで除くので画面には出ない（数は API の応答の check.unknownIds）`, ``);

lines.push(`## 5. 採点の再確認（別のモデル）`, ``);
if (agree.length) {
  const exact = agree.filter((x) => x.c === x.h).length;
  const rel = agree.filter((x) => (x.c >= 1) === (x.h >= 1)).length;
  const higher = agree.filter((x) => x.h > x.c).length;
  const lower = agree.filter((x) => x.h < x.c).length;
  lines.push(`抜き取りの ${agree.length}件を ${RECHECK_MODEL}（深く考える設定）が、最初の採点を見ずに採点し直した。人の確認ではない。`, ``);
  lines.push(`- 点数がぴったり一致：${exact}件（${pct(exact / agree.length)}）`);
  lines.push(`- 「関係あり（1以上）か」が一致：${rel}件（${pct(rel / agree.length)}）`);
  lines.push(`- 再確認のほうが高い：${higher}件、低い：${lower}件`);
  const mats = [0, 1, 2].map((c) => [0, 1, 2].map((h) => agree.filter((x) => x.c === c && x.h === h).length));
  lines.push(``, `| 最初の採点 ＼ 再確認 | 0 | 1 | 2 |`, `| --- | --- | --- | --- |`, ...mats.map((row, c) => `| ${c} | ${row.join(" | ")} |`));
} else lines.push(`- まだ再確認していない。\`pnpm eval --reuse --recheck\` で、抜き取りの候補を別のモデルが採点し直す`);
// 「気づいたこと」など手で書いた部分（目印より後ろ）は、作り直しても残す
const MARK = "<!-- ここから下は手で書いた部分（pnpm eval で作り直しても残る） -->";
const prevResults = existsSync("eval/RESULTS.md") ? readFileSync("eval/RESULTS.md", "utf8") : "";
const handwritten = prevResults.includes(MARK) ? prevResults.slice(prevResults.indexOf(MARK)) : `${MARK}\n\n## 気づいたこと\n\n（結果を見て書く）\n`;
writeFileSync("eval/RESULTS.md", lines.join("\n") + "\n" + handwritten);
console.log(lines.join("\n"));
