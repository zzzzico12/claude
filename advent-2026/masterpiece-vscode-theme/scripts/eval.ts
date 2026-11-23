// 評価
//   pnpm eval
// 1. 読みやすさ：すべてのテーマの「文字と背景」の組が、WCAG AA（4.5:1）を満たすか。AAA（7:1）は何割か
//    あわせて、調整する前（AI が選んだ色そのまま）では何割が基準を満たしていなかったか
// 2. 絵の色をどれだけ残せたか：読みやすさのための調整で、色がどれだけ変わったか（ΔE2000）
// 3. 見分けやすさ：コードの色（文字・キーワード・文字列・関数・型・数値・コメント）どうしの差
// 2 と 3 は、AI の割り当てと、機械的な割り当て（明るさと彩度の順）を比べる
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AA, colorDifference, contrastRatio } from "../lib/color.js";
import type { PaintingInfo } from "../lib/paintings.js";
import { buildTheme, MIN_TOKEN_DE, normalizeBackground, type Roles } from "../lib/theme.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const infos = JSON.parse(readFileSync(join(appDir, "lib", "paintings-data.json"), "utf8")) as PaintingInfo[];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f1 = (x: number) => x.toFixed(1);
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const TEXT_ROLES = ["foreground", "keyword", "string", "function", "type", "number", "comment"] as const;

function analyze(roles: Roles) {
  const built = buildTheme("eval", roles);
  const ratios = built.pairs.map((p) => contrastRatio(p.fg, p.bg));
  // 調整する前：AI（または機械的な割り当て）が選んだ文字色を、そのまま背景に置いた場合
  const bg = normalizeBackground(roles.background, roles.type);
  const raw = { ...roles, type: roles.type_ } as Record<string, string>;
  const before = TEXT_ROLES.map((r) => contrastRatio(raw[r === "type" ? "type" : r], bg));
  const adj = built.adjustments.filter((a) => a.role !== "background");
  const finals = TEXT_ROLES.map((r) => built.adjustments.find((a) => a.role === r)!.adjusted);
  const pairDE: number[] = [];
  for (let i = 0; i < finals.length; i++) for (let j = i + 1; j < finals.length; j++) pairDE.push(colorDifference(finals[i], finals[j]));
  return {
    pairs: ratios.length,
    passAA: ratios.filter((r) => r >= AA - 1e-9).length,
    passAAA: ratios.filter((r) => r >= 7).length,
    minRatio: Math.min(...ratios),
    beforePassAA: before.filter((r) => r >= AA).length / before.length,
    meanDE: mean(adj.map((a) => a.deltaE)),
    changed: adj.filter((a) => a.deltaE > 0.5).length / adj.length,
    minPairDE: Math.min(...pairDE),
    closePairs: pairDE.filter((d) => d < MIN_TOKEN_DE).length,
  };
}

const rows: string[] = [];
const ai: ReturnType<typeof analyze>[] = [];
const naive: ReturnType<typeof analyze>[] = [];
for (const p of infos) {
  const a = analyze(p.roles);
  const n = analyze(p.naiveRoles);
  ai.push(a);
  naive.push(n);
  rows.push(
    `| ${p.titleJa}（${p.artistJa}） | ${p.roles.type === "dark" ? "ダーク" : "ライト"} | ${a.passAA}/${a.pairs} | ${f1(a.minRatio)} | ${pct(a.beforePassAA)} | ${f1(a.meanDE)} / ${f1(n.meanDE)} | ${f1(a.minPairDE)} / ${f1(n.minPairDE)} | ${a.closePairs} / ${n.closePairs} |`,
  );
}

const total = (xs: ReturnType<typeof analyze>[], k: "pairs" | "passAA" | "passAAA") => xs.reduce((s, x) => s + x[k], 0);
const summary = (label: string, xs: ReturnType<typeof analyze>[]) =>
  `| ${label} | ${total(xs, "passAA")}/${total(xs, "pairs")}（${pct(total(xs, "passAA") / total(xs, "pairs"))}） | ${pct(total(xs, "passAAA") / total(xs, "pairs"))} | ${pct(mean(xs.map((x) => x.beforePassAA)))} | ${f1(mean(xs.map((x) => x.meanDE)))} | ${f1(mean(xs.map((x) => x.minPairDE)))} | ${xs.reduce((s, x) => s + x.closePairs, 0)} |`;

const md = `# 評価結果：名画のエディタ配色

- 実行日：${new Date().toISOString().slice(0, 10)}
- 対象：シカゴ美術館のパブリックドメインの名画 ${infos.length} 点から作ったテーマ
- 再現：\`pnpm eval\`（AI は呼ばない。\`lib/paintings-data.json\` の割り当てを使う）

## 1. 読みやすさ（WCAG のコントラスト比）

検査した組：エディタの文字・コードの色6種類・行番号と背景、サイドバー・アクティビティバー・タブ・ステータスバー・ボタン・入力欄・一覧の選択・ターミナルの文字と背景（1テーマあたり ${ai[0].pairs} 組）。

| 割り当て | AA（4.5:1）を満たした組 | AAA（7:1）も満たした割合 | 調整する前に AA を満たしていた割合（コードの色） | 調整による色の変化（ΔE2000 の平均） | コードの色どうしの最小の差（ΔE2000 の平均） | 見分けにくい組（ΔE<${MIN_TOKEN_DE}）の合計 |
| --- | --- | --- | --- | --- | --- | --- |
${summary("AI（Claude）", ai)}
${summary("機械的な割り当て（明るさ・彩度の順）", naive)}

- **AA はすべてのテーマのすべての組で満たす**（調整で保証している）。調整する前は、AI が選んだ色のうち AA を満たしていたのは上の割合だけ
- ΔE2000 は色の差の目安。1 前後でほぼ見分けられない、5 で並べると違いが分かる、10 を超えると別の色に見える程度
- 「調整による色の変化」は小さいほど、絵の色をそのまま使えている

## テーマごと

左が AI、右が機械的な割り当て。

| テーマ | 種類 | AA を満たした組 | 最小のコントラスト比 | 調整前に AA を満たしていた割合（AI） | 調整による色の変化 ΔE | コードの色どうしの最小の差 ΔE | 見分けにくい組 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## 読み方と限界

- コントラスト比は WCAG 2.2 の式。WCAG は「文字の読みやすさの最低限」で、目の疲れにくさや好みまでは測れない
- 単色に近い絵（ホイッスラーの夜想曲など）は、元の画像に鮮やかな色がほとんどないので、コードの色どうしの差が小さくなる。明るさを動かして離しているが、限界がある
- 「機械的な割り当て」は、暗い色（ライトなら明るい色）を背景に、彩度の高い順にキーワードなどを割り当てたもの
- 配色の好み（きれいか、絵らしいか）は数字では測っていない。スクリーンショットで人が確かめる
`;

// ---------- 4. ターミナル（Warp）：背景に絵を敷いたときの読みやすさ ----------
const warpFile = join(appDir, "lib", "warp-summary.json");
let warpMd = "";
if (existsSync(warpFile)) {
  const w = JSON.parse(readFileSync(warpFile, "utf8")) as { title: string; type: string; opacity: number; passRate: number }[];
  warpMd = `
## 4. ターミナル（Warp）：背景に絵を敷いたときの読みやすさ

Warp のテーマは、背景色に絵を薄く混ぜて敷く。文字の後ろが場所ごとに変わるので、絵の画素ごとに「背景色と絵を混ぜた色」に対する文字のコントラスト比を計算し、**検査した文字色（文字・コメント・赤・緑・黄・青・紫・水色）すべてが、98%以上の画素で AA（4.5:1）を満たす範囲で、いちばん濃く**絵を見せる濃さを選んだ（5刻み、最大60）。文字色は、絵を混ぜる余裕を取って背景色に対して 7:1 にしてある。

- 絵の濃さ：${Math.min(...w.map((x) => x.opacity))}〜${Math.max(...w.map((x) => x.opacity))}（中央値 ${[...w.map((x) => x.opacity)].sort((a, b) => a - b)[Math.floor(w.length / 2)]}）
- 基準を満たした画素の割合（いちばん悪い文字色）：${(Math.min(...w.map((x) => x.passRate)) * 100).toFixed(1)}%〜${(Math.max(...w.map((x) => x.passRate)) * 100).toFixed(1)}%

| テーマ | 種類 | 絵の濃さ | 基準を満たした画素 |
| --- | --- | --- | --- |
${w.map((x) => `| ${x.title} | ${x.type === "dark" ? "ダーク" : "ライト"} | ${x.opacity} | ${(x.passRate * 100).toFixed(1)}% |`).join("\n")}

- 「背景色と絵を sRGB で単純に混ぜる」と仮定して計算している。Warp の実際の混ぜ方（濃さの意味）は資料に書かれていないので、見た目で確かめる
- 最初は文字色を背景に対してちょうど 4.5:1 にしていたので、絵を少しでも混ぜると基準を割り、すべての絵で濃さ 0（絵なし）になった。7:1 の余裕を取って解決した
`;
}

writeFileSync(join(appDir, "eval", "RESULTS.md"), md + warpMd);
console.log(summary("AI", ai));
console.log(summary("機械的", naive));
