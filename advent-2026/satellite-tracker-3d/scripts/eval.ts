// 評価
//   pnpm eval          … 1〜3（AI は呼ばない）
//   pnpm eval -- --ai  … 4 も（Claude を 8 回呼ぶ。約0.1ドル）
// 1. 位置のずれ：ISS を、CelesTrak の軌道要素から SGP4 で計算した位置と、NASA の軌道データ（OEM）で比べる
// 2. 計算の速さ：全機の位置を1回計算するのにかかる時間（Node。ブラウザの Worker でもほぼ同じ処理）
// 3. 種類の決め方：CelesTrak の分類・UCS・名前のどれで決まったか
// 4. AI の解説：代表的な衛星で、解説の数字が事実と一致するか
// 結果は eval/RESULTS.md に書く（4 は eval/explain-samples.json にも）
import { apply, compactGp, expandGp, j2000ToTeme, parseOem, positionsEcf, positionTeme, toSatrec, type Gp } from "@advent/orbit";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Catalog } from "../lib/facts.js";
import { CATEGORIES } from "../lib/category.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const latest = (dir: string, re: RegExp) => {
  const f = readdirSync(dir).filter((x) => re.test(x)).sort().at(-1);
  if (!f) throw new Error(`${dir} に ${re} のファイルがありません。README の「使い方」を見て取得してください`);
  return join(dir, f);
};
// 軌道要素は pnpm catalog で保存したもの（CelesTrak に余計に問い合わせない）。NASA の ISS 軌道データは、なければその日の分を取る
const activePath = latest(join(appDir, "data", "celestrak"), /^active-.*\.json$/);
const OEM_URL = "https://nasa-public-data.s3.amazonaws.com/iss-coords/current/ISS_OEM/ISS.OEM_J2K_EPH.txt";
const nasaDir = join(appDir, "data", "nasa");
if (!existsSync(nasaDir) || !readdirSync(nasaDir).some((f) => f.startsWith("ISS.OEM"))) {
  mkdirSync(nasaDir, { recursive: true });
  const res = await fetch(OEM_URL, { headers: { "User-Agent": "advent-2026-satellite-tracker (https://github.com/zzzzico12/claude)" } });
  if (!res.ok) throw new Error(`NASA の ISS 軌道データが HTTP ${res.status} を返しました`);
  writeFileSync(join(nasaDir, `ISS.OEM_J2K_EPH-${new Date().toISOString().slice(0, 10)}.txt`), await res.text());
}
const oemPath = latest(nasaDir, /^ISS\.OEM_J2K_EPH-.*\.txt$/);
const gps = expandGp(compactGp(JSON.parse(readFileSync(activePath, "utf8")), "eval"));
const catalog = JSON.parse(readFileSync(join(appDir, "public", "data", "catalog.json"), "utf8")) as Catalog;
const fmt = (x: number, d = 1) => x.toFixed(d);

// ---------- 1. ISS ----------
function issError() {
  const iss = gps.find((g) => g.NORAD_CAT_ID === 25544)!;
  const satrec = toSatrec(iss)!;
  const oemText = readFileSync(oemPath, "utf8");
  const created = oemText.match(/CREATION_DATE\s*=\s*(\S+)/)?.[1];
  const oem = parseOem(oemText);
  const epoch = Date.parse(`${iss.EPOCH}Z`);
  const rows: { h: number; total: number; radial: number; along: number; cross: number }[] = [];
  const dot = (a: V, b: V) => a.x * b.x + a.y * b.y + a.z * b.z;
  const cross = (a: V, b: V): V => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const unit = (a: V): V => {
    const n = Math.hypot(a.x, a.y, a.z);
    return { x: a.x / n, y: a.y / n, z: a.z / n };
  };
  type V = { x: number; y: number; z: number };
  for (const h of [-48, -24, -12, -6, -3, 0, 3, 6, 12, 24, 48, 72]) {
    const t = epoch + h * 3600_000;
    const p = oem.reduce((a, b) => (Math.abs(+b.t - t) < Math.abs(+a.t - t) ? b : a));
    if (Math.abs(+p.t - t) > 5 * 60_000) continue; // OEM の範囲外
    const M = j2000ToTeme(p.t);
    const q = apply(M, p);
    const qv = apply(M, { x: p.vx, y: p.vy, z: p.vz });
    const r = positionTeme(satrec, p.t)!;
    const d = { x: r.x - q.x, y: r.y - q.y, z: r.z - q.z };
    const R = unit(q);
    const C = unit(cross(q, qv));
    const I = cross(C, R);
    rows.push({ h, total: Math.hypot(d.x, d.y, d.z), radial: dot(d, R), along: dot(d, I), cross: dot(d, C) });
  }
  return { iss, created, oemRange: [oem[0].t.toISOString(), oem.at(-1)!.t.toISOString()], rows };
}

// ---------- 2. 速さ ----------
function speed() {
  const satrecs = gps.map(toSatrec);
  const out = new Float64Array(gps.length * 3);
  const now = new Date();
  positionsEcf(satrecs, now, out); // 1回目は JIT の準備
  const times: number[] = [];
  let ok = 0;
  for (let k = 0; k < 20; k++) {
    const s = performance.now();
    ok = positionsEcf(satrecs, new Date(now.getTime() + k * 1000), out);
    times.push(performance.now() - s);
  }
  times.sort((a, b) => a - b);
  return { n: gps.length, failedSatrec: satrecs.filter((s) => !s).length, ok, median: times[10], p90: times[18] };
}

// ---------- 3. 種類 ----------
function categories() {
  const counts = new Array(CATEGORIES.length).fill(0);
  for (const v of Object.values(catalog.sats)) counts[v[0]]++;
  const ucs = JSON.parse(readFileSync(join(appDir, "public", "data", "ucs.json"), "utf8"));
  const inUcs = Object.keys(ucs).length;
  const notStarlink = gps.filter((g) => !g.OBJECT_NAME.startsWith("STARLINK"));
  const inUcsNotStarlink = notStarlink.filter((g) => ucs[g.NORAD_CAT_ID]).length;
  return { counts, inUcs, total: Object.keys(catalog.sats).length, notStarlink: notStarlink.length, inUcsNotStarlink };
}

// ---------- 4. AI ----------
const SAMPLES = ["ISS (ZARYA)", "HIMAWARI-9", "QZS-2 (MICHIBIKI-2)", "NAVSTAR 43 (USA 132)", "STARLINK-1008", "KUIPER-00008", "YAOGAN-30 01", "HST"];
async function explainSamples() {
  const { explain } = await import("../lib/explain.js");
  const ucs = JSON.parse(readFileSync(join(appDir, "public", "data", "ucs.json"), "utf8"));
  const out = [];
  for (const name of SAMPLES) {
    const gp = gps.find((g) => g.OBJECT_NAME === name);
    if (!gp) continue;
    const r = await explain(gp as Gp, catalog, ucs[gp.NORAD_CAT_ID]);
    out.push({ name: gp.OBJECT_NAME, norad: gp.NORAD_CAT_ID, inUcs: Boolean(ucs[gp.NORAD_CAT_ID]), text: r.text, unmatchedNumbers: r.unmatchedNumbers });
    process.stderr.write(`${gp.OBJECT_NAME}: ${r.unmatchedNumbers.length ? `⚠ ${r.unmatchedNumbers.join(",")}` : "✓"}\n`);
  }
  writeFileSync(join(appDir, "eval", "explain-samples.json"), JSON.stringify(out, null, 1));
  return out;
}

async function main() {
  const a = issError();
  const s = speed();
  const c = categories();
  const samplesPath = join(appDir, "eval", "explain-samples.json");
  const samples = process.argv.includes("--ai") ? await explainSamples() : existsSync(samplesPath) ? JSON.parse(readFileSync(samplesPath, "utf8")) : null;

  const near = a.rows.filter((r) => Math.abs(r.h) <= 6);
  const md = `# 評価結果：人工衛星は今どこ？

- 実行日：${new Date().toISOString().slice(0, 10)}
- 軌道要素：${activePath.split("/").at(-1)}（CelesTrak、稼働中 ${s.n} 機）
- 再現：\`pnpm eval\`（AI の解説も評価するときは \`pnpm eval -- --ai\`）。データの取り方は README の「使い方」

## 1. 位置のずれ（ISS）

CelesTrak の軌道要素（エポック ${a.iss.EPOCH.slice(0, 19)} UTC）から SGP4 で計算した位置と、NASA の ISS 軌道データ（${oemPath.split("/").at(-1)}、作成 ${a.created} UTC、${a.oemRange[0].slice(0, 16)}〜${a.oemRange[1].slice(0, 16)}）を比べた。NASA のデータは J2000 座標なので、SGP4 の座標（TEME）に変換してから比べている。

| エポックから | ずれ（km） | 高さ方向 | 進行方向 | 軌道面に垂直 |
| ---: | ---: | ---: | ---: | ---: |
${a.rows.map((r) => `| ${r.h > 0 ? "+" : ""}${r.h} 時間 | ${fmt(r.total)} | ${fmt(r.radial, 2)} | ${fmt(r.along)} | ${fmt(r.cross, 2)} |`).join("\n")}

- エポックの前後6時間のずれ：${fmt(Math.min(...near.map((r) => r.total)))}〜${fmt(Math.max(...near.map((r) => r.total)))} km。ほとんどが進行方向（ISS は秒速 7.66 km なので、${fmt(Math.max(...near.map((r) => Math.abs(r.along))) / 7.66, 1)} 秒ほど前後にずれているのと同じ）
- 地球儀の初期の表示（地球の中心から約6万km）では、1画素がおよそ数十 km にあたるので、このずれは見た目には分からない
- 注意：NASA のデータも「作成時点からの予測」で、作成から日がたつほど、NASA 側の予測もずれる（大気の抵抗の見込み違いなど）。「正解」ではなく「独立に計算された別の答え」と比べている

## 2. 計算の速さ

| 項目 | 結果 |
| --- | --- |
| 衛星の数 | ${s.n} |
| 軌道要素を読み込めなかった衛星 | ${s.failedSatrec} |
| 位置を計算できた衛星 | ${s.ok} |
| 全機の位置を1回計算する時間（中央値・Node） | ${fmt(s.median)} ms |
| 同（遅い方から2番目、20回中） | ${fmt(s.p90)} ms |

- 画面では、これを Web Worker で 0.25 秒ごとに行い、そのあいだは補間している。毎フレーム計算すると、1コマの持ち時間（60コマ/秒なら 16.7 ms）の半分以上を計算だけで使ってしまう

## 3. 描画の速さ

ブラウザで画面を開き、右上の「描画 ○ コマ/秒（10秒平均）」を記録する（ブラウザの自動操作の道具は入れていないので、人が見て記録する）。

| 環境 | 表示した衛星 | 10秒平均 |
| --- | --- | --- |
| 利用者の Mac（2026-11-24、実時間） | 全機（16,904機） | 60 コマ/秒 |
| 利用者の Mac（2026-11-24、実時間） | Starlink 以外（5,705機） | 60 コマ/秒 |

- どちらも 60 コマ/秒で、画面の書き換えの上限（多くの画面は 60 Hz）に張り付いている。Starlink の 11,199 機を消しても変わらないので、点の数は描画の足かせになっていない
- ブラウザの Worker での位置の計算は 1回 14〜19 ms（Node の 9.8 ms より遅い）。0.25 秒（250 ms）ごとなので、余裕は十分ある

## 4. 種類の決め方

- UCS Satellite Database（2023年5月版）に載っていた衛星：${c.inUcs} / ${c.total} 機（${fmt((c.inUcs / c.total) * 100)}%）。Starlink を除くと ${c.inUcsNotStarlink} / ${c.notStarlink} 機（${fmt((c.inUcsNotStarlink / c.notStarlink) * 100)}%）
- 種類ごとの数：${CATEGORIES.map((x, i) => `${x.label} ${c.counts[i]}`).join("、")}

## 5. AI の解説（数字の照合）

${
  samples
    ? `| 衛星 | UCS に載っている | 照合できなかった数字 |
| --- | --- | --- |
${samples.map((x: { name: string; inUcs: boolean; unmatchedNumbers: string[] }) => `| ${x.name} | ${x.inUcs ? "○" : "×"} | ${x.unmatchedNumbers.join("、") || "なし"} |`).join("\n")}

解説の全文は [explain-samples.json](explain-samples.json)。`
    : "（`pnpm eval -- --ai` で実行する）"
}

## 読み方と限界

- 位置のずれは ISS の1機だけ。ISS は軌道の高さを頻繁に上げ直すので、その直後は軌道要素が古いとずれが大きくなる
- 数字の照合は「同じ数字が事実のどこかにあるか」までで、文の意味が正しいかは確かめていない
`;
  writeFileSync(join(appDir, "eval", "RESULTS.md"), md);
  console.log(md);
}

main();
