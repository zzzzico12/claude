// 評価（pnpm eval）。仕様の「数字はすべてコードで計算して、AI の文章の数字と自動で照合する」を確かめる
// 1. 大きさの推定：直径が測られている小惑星で、明るさからの推定（最小〜最大）の中に測った値が入るか
// 2. AI の文章：今の接近すべて（日本語・英語）で、文章の数字がコードの計算と一致するか。
//    「怖がりすぎないための一言」が Sentry の事実と合っているか、あおる言葉を使っていないか
// 3. 比べる物：Wikidata の値が1つに決まったもの・除いたもの
// AI の結果は data/eval-run.json に保存し、`pnpm eval --reuse` で API を呼ばずに表だけ作り直せる
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { OBJECTS } from "../reference/objects.js";
import { diameterFromH, factsOf } from "../lib/compare.js";
import { explainApproach, type Explanation, type Lang } from "../lib/explain.js";
import { fetchApproaches, fetchSentry } from "../lib/jpl.js";

const RUN = "data/eval-run.json";
const reuse = process.argv.includes("--reuse") && existsSync(RUN);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
};

interface Run {
  ranAt: string;
  sizeCheck: { des: string; h: number; measured: number; min: number; max: number }[];
  ai: { des: string; time: string; lang: Lang; sentry: boolean; explanation: Explanation; unmatched: string[]; ms: number }[];
}

async function run(): Promise<Run> {
  // 1. 直径が測られている小惑星（1900〜2100年に 0.05 au 以内に近づくもの）
  const wide = await fetchApproaches({ dateMin: "1900-01-01", dateMax: "2100-01-01", distMax: 0.05 });
  const seen = new Set<string>();
  const sizeCheck = wide
    .filter((a) => a.diameter != null && a.h != null && !seen.has(a.des) && seen.add(a.des))
    .map((a) => ({ des: a.des, h: a.h!, measured: a.diameter! * 1000, ...diameterFromH(a.h!) }));
  console.log(`大きさ：直径が測られている ${sizeCheck.length}個`);

  // 2. 今の接近すべてを、日本語と英語で説明させる
  const now = await fetchApproaches();
  const sentry = await fetchSentry();
  const ai: Run["ai"] = [];
  for (const lang of ["ja", "en"] as Lang[]) {
    for (const a of now) {
      const f = factsOf(a, OBJECTS.objects);
      const s = sentry.get(a.des) ?? null;
      const t0 = Date.now();
      const { explanation, unmatchedNumbers } = await explainApproach(a, f, s, lang);
      ai.push({ des: a.des, time: a.time, lang, sentry: !!s, explanation, unmatched: unmatchedNumbers, ms: Date.now() - t0 });
      process.stdout.write(unmatchedNumbers.length ? "x" : ".");
    }
    console.log(` ${lang} 終わり`);
  }
  const r: Run = { ranAt: new Date().toISOString(), sizeCheck, ai };
  mkdirSync("data", { recursive: true });
  writeFileSync(RUN, JSON.stringify(r, null, 1));
  return r;
}

const r: Run = reuse ? JSON.parse(readFileSync(RUN, "utf8")) : await run();

// ---------- 集計 ----------
const L: string[] = [];
L.push(`# Day 09 の評価結果`, ``, `- 実行：${r.ranAt.slice(0, 10)}`, ``);

// 1. 大きさ
const inside = r.sizeCheck.filter((x) => x.measured >= x.min && x.measured <= x.max);
const below = r.sizeCheck.filter((x) => x.measured < x.min);
const above = r.sizeCheck.filter((x) => x.measured > x.max);
const ratio = r.sizeCheck.map((x) => x.measured / Math.sqrt(x.min * x.max));
L.push(`## 1. 大きさの推定（明るさから、反射率 0.05〜0.25 を仮定）`, ``);
L.push(`直径が測られている小惑星 ${r.sizeCheck.length}個（1900〜2100年に 0.05 au 以内に近づくもの、JPL の値）で、推定の幅に測った値が入るかを調べた。`, ``);
L.push(`| | 個数 | 割合 |`, `| --- | --- | --- |`);
L.push(`| 推定の幅の中 | ${inside.length} | ${pct(inside.length / r.sizeCheck.length)} |`);
L.push(`| 推定の最小より小さい（反射率が 0.25 より高い） | ${below.length} | ${pct(below.length / r.sizeCheck.length)} |`);
L.push(`| 推定の最大より大きい（反射率が 0.05 より低い） | ${above.length} | ${pct(above.length / r.sizeCheck.length)} |`, ``);
L.push(`測った値 ÷ 推定の真ん中（幾何平均）の中央値：${median(ratio).toFixed(2)}`, ``);
// 反射率の幅を変えたら、どれだけ入るか（幅を広げるほど入るが、幅が広すぎると「どれくらいの大きさか」が伝わらない）
L.push(`反射率の仮定の幅を変えたときに、測った値が推定の幅に入る割合：`, ``, `| 反射率の幅 | 入る割合 | 大きさの幅（最大 ÷ 最小） |`, `| --- | --- | --- |`);
for (const [lo, hi] of [[0.05, 0.25], [0.04, 0.3], [0.03, 0.4], [0.02, 0.5]]) {
  const d = (h: number, p: number) => (1329 / Math.sqrt(p)) * 10 ** (-h / 5) * 1000;
  const n = r.sizeCheck.filter((x) => x.measured >= d(x.h, hi) && x.measured <= d(x.h, lo)).length;
  L.push(`| ${lo}〜${hi}${lo === 0.05 ? "（このアプリ）" : ""} | ${pct(n / r.sizeCheck.length)} | ${Math.sqrt(hi / lo).toFixed(1)}倍 |`);
}
L.push(``);

// 2. AI
const ai = r.ai;
const byLang = (l: Lang) => ai.filter((x) => x.lang === l);
const bad = ai.filter((x) => x.unmatched.length);
const ALARM = /危険|脅威|恐ろしい|大惨事|dangerous|threat|terrifying|catastroph/i;
const alarm = ai.filter((x) => ALARM.test(Object.values(x.explanation).join(" ")));
// calm の確かめ：Sentry に載っていないものは「100年」と「Sentry」に触れる。載っているものは確率かトリノ・スケールに触れる
const calmOk = (x: Run["ai"][number]) => {
  const c = x.explanation.calm;
  return x.sentry ? /トリノ|Torino|%|確率|probab/i.test(c) : /Sentry/.test(c) && /100/.test(c);
};
const calmBad = ai.filter((x) => !calmOk(x));
L.push(`## 2. AI の文章`, ``);
L.push(`今の接近 ${byLang("ja").length}件を、日本語と英語で1回ずつ説明させた（計 ${ai.length}件）。`, ``);
L.push(`| 確かめたこと | 結果 |`, `| --- | --- |`);
L.push(`| 文章の数字がすべてコードの計算と一致 | ${ai.length - bad.length} / ${ai.length}（日本語 ${byLang("ja").filter((x) => !x.unmatched.length).length}・英語 ${byLang("en").filter((x) => !x.unmatched.length).length}） |`);
L.push(`| 「怖がりすぎないための一言」が Sentry の事実と合う | ${ai.length - calmBad.length} / ${ai.length}（Sentry に載っている接近 ${ai.filter((x) => x.sentry).length / 2}件を含む） |`);
L.push(`| あおる言葉（危険・脅威・dangerous・threat など）を使っていない | ${ai.length - alarm.length} / ${ai.length} |`);
L.push(`| 1件の時間（中央値） | ${(median(ai.map((x) => x.ms)) / 1000).toFixed(1)}秒 |`, ``);
if (bad.length) {
  L.push(`照合できなかった数字：`, ``);
  for (const x of bad) L.push(`- ${x.des}（${x.lang}）：${x.unmatched.join("、")}`);
  L.push(``);
}
if (calmBad.length) {
  L.push(`Sentry の事実と合わなかった一言：`, ``);
  for (const x of calmBad) L.push(`- ${x.des}（${x.lang}、Sentry ${x.sentry ? "あり" : "なし"}）：${x.explanation.calm}`);
  L.push(``);
}
const listed = ai.filter((x) => x.sentry);
if (listed.length) {
  L.push(`Sentry に載っている接近の「一言」：`, ``);
  for (const x of listed) L.push(`- ${x.des}（${x.lang}）：${x.explanation.calm}`);
  L.push(``);
}

// 3. 比べる物
L.push(`## 3. 比べる物（Wikidata、${OBJECTS.retrievedAt.slice(0, 10)} に取得）`, ``);
L.push(`- 優先の値が1つに決まったもの：${OBJECTS.objects.length}件`);
L.push(`- 値が1つに決まらず除いたもの：${OBJECTS.skipped.length ? OBJECTS.skipped.map((s) => `${s.qid}（${s.values.join("・")}）`).join("、") : "なし（候補を選ぶ段階で、値が複数あるもの・ないものは外した。README の表）"}`, ``);

const MARK = "<!-- ここから下は手で書いた部分（pnpm eval で作り直しても残る） -->";
const prev = existsSync("eval/RESULTS.md") ? readFileSync("eval/RESULTS.md", "utf8") : "";
const hand = prev.includes(MARK) ? prev.slice(prev.indexOf(MARK)) : `${MARK}\n\n## 気づいたこと\n\n（結果を見て書く）\n`;
writeFileSync("eval/RESULTS.md", L.join("\n") + "\n" + hand);
console.log(L.join("\n"));
