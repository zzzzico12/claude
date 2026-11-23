// 評価
//   pnpm eval
// A. CO2：Google Cloud のリージョンで、Ember から出した推定値と Google の公式値（送電網の CO2）を比べる
// B. 遅延：Azure のリージョン間の実測値と、推定値を比べる（推定には、その2つのリージョン自身の実測値は使わない）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { estimateCarbon } from "../lib/carbon.js";
import { CARBON } from "../lib/carbon-data.js";
import { AZURE_RTT, AZURE_RTT_MEASURED_ON } from "../lib/latency-data.js";
import { distanceKm, distanceRttMs, estimateRtt } from "../lib/latency.js";
import { REGIONS } from "../lib/regions.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const order = xs.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(xs.length);
    for (let i = 0; i < order.length; ) {
      let j = i;
      while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
      for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const ma = mean(ra);
  const mb = mean(rb);
  const cov = mean(ra.map((x, i) => (x - ma) * (rb[i] - mb)));
  const sd = (xs: number[], m: number) => Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  return cov / (sd(ra, ma) * sd(rb, mb));
}
const f1 = (x: number) => x.toFixed(1);
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

// ---------- A. CO2 ----------
const out: string[] = [];
const YEARS = [2024, 2025];
const google = CARBON.google as Readonly<Record<string, Readonly<Record<string, { g: number }>>>>;
const summaryA: string[] = [];
let detailYear = 2024;
const detailRows: string[] = [];

for (const year of YEARS) {
  const rows = REGIONS.filter((r) => r.provider === "gcp" && google[String(year)]?.[r.id]).flatMap((r) => {
    const official = google[String(year)][r.id].g;
    const est = estimateCarbon(r, { year });
    const estCountry = estimateCarbon(r, { year, countryOnly: true });
    // Ember にその年の値がない国・州は比べない
    if (!est || !estCountry || est.year !== year || estCountry.year !== year) return [];
    return [{ r, official, est: est.g, estCountry: estCountry.g, basis: est.basis }];
  });
  const off = rows.map((x) => x.official);
  for (const [label, key] of [
    ["国単位（米国も国の平均）", "estCountry"],
    ["このアプリ（米国は州単位）", "est"],
  ] as const) {
    const est = rows.map((x) => x[key]);
    const err = rows.map((x) => Math.abs(x[key] - x.official));
    const rel = rows.map((x) => Math.abs(x[key] - x.official) / x.official);
    const topOverlap = (n: number) => {
      const byOff = [...rows].sort((a, b) => a.official - b.official).slice(0, n).map((x) => x.r.id);
      const byEst = [...rows].sort((a, b) => a[key] - b[key]).slice(0, n).map((x) => x.r.id);
      return byEst.filter((id) => byOff.includes(id)).length;
    };
    summaryA.push(
      `| ${year} | ${label} | ${rows.length} | ${f1(mean(err))} | ${f1(median(err))} | ${pct(median(rel))} | ${spearman(est, off).toFixed(2)} | ${topOverlap(5)} / 5 | ${topOverlap(10)} / 10 |`,
    );
  }
  if (year === detailYear) {
    for (const x of [...rows].sort((a, b) => Math.abs(b.est - b.official) - Math.abs(a.est - a.official))) {
      detailRows.push(
        `| ${x.r.id} | ${x.r.city} | ${x.official} | ${x.est}（${x.basis === "state" ? "州" : "国"}） | ${x.est - x.official > 0 ? "+" : ""}${f1(x.est - x.official)} | ${x.estCountry} |`,
      );
    }
  }
}

// ---------- B. 遅延 ----------
const hubs = REGIONS.filter((r) => r.provider === "azure" && AZURE_RTT[r.id]);
type Pair = { a: string; b: string; km: number; truth: number; dist: number; hub: number };
const pairs: Pair[] = [];
for (const a of hubs) {
  for (const b of hubs) {
    if (a.id >= b.id) continue;
    const ab = AZURE_RTT[a.id]?.[b.id];
    const ba = AZURE_RTT[b.id]?.[a.id];
    if (ab === undefined || ba === undefined) continue;
    const km = distanceKm(a, b);
    // 同じ都市にある別リージョン（例：eastus と eastus2）は除く
    if (km < 50) continue;
    pairs.push({
      a: a.id,
      b: b.id,
      km,
      truth: (ab + ba) / 2,
      dist: distanceRttMs(km),
      hub: estimateRtt(a, b, new Set([a.id, b.id])).ms,
    });
  }
}
const latRow = (label: string, ps: Pair[], key: "dist" | "hub") => {
  const err = ps.map((p) => Math.abs(p[key] - p.truth));
  const within = (ms: number) => err.filter((e) => e <= ms).length / err.length;
  // 「Web アプリ（150ms 以内）」に入るかどうかの判定が、実測と一致した割合
  const agree = ps.filter((p) => p[key] <= 150 === p.truth <= 150).length / ps.length;
  return `| ${label} | ${ps.length} | ${f1(mean(err))} | ${f1(median(err))} | ${pct(within(20))} | ${pct(agree)} |`;
};
const long = pairs.filter((p) => p.km >= 5000);
const worstDist = [...pairs].sort((a, b) => Math.abs(b.dist - b.truth) - Math.abs(a.dist - a.truth)).slice(0, 8);

const md = `# 評価結果：CO2の少ないクラウドリージョン

- 実行日：${new Date().toISOString().slice(0, 10)}
- 再現：\`pnpm data && pnpm eval\`

## A. CO2：Ember からの推定値 と Google Cloud の公式値

Google Cloud が公開しているリージョンごとの「送電網の CO2（gCO2eq/kWh）」を正解として、Ember の国別・州別の年平均から出した推定値と比べた。同じ年どうしで比べる。

| 年 | 推定のしかた | リージョン数 | 平均誤差（g） | 誤差の中央値（g） | 誤差率の中央値 | 順位の相関 | CO2 の少ない上位5の一致 | 上位10の一致 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${summaryA.join("\n")}

- 順位の相関（スピアマン）は 1 に近いほど、「CO2 の少ない順」の並びが公式値と同じ
- 「上位5の一致」は、CO2 が少ないリージョン5つのうち、推定でも上位5に入った数

### リージョンごと（${detailYear}年、ずれの大きい順）

| リージョン | 所在地 | 公式値 | 推定値 | ずれ | 国単位の推定値 |
| --- | --- | --- | --- | --- | --- |
${detailRows.join("\n")}

## B. 遅延：推定値 と Azure の実測値

Azure のリージョン間の往復時間の実測値（P50、${AZURE_RTT_MEASURED_ON} までの30日間）を正解とした。「中継点つき」の推定では、**その2つのリージョン自身の実測値は使わず**、近くの別の Azure リージョンの実測値を使う（答えそのものを見ないようにするため）。

| 推定のしかた | 組の数 | 平均誤差（ms） | 誤差の中央値（ms） | 誤差20ms以内 | 「150ms以内か」の判定が一致 |
| --- | --- | --- | --- | --- | --- |
${latRow("距離だけ（すべての組）", pairs, "dist")}
${latRow("中継点つき・このアプリ（すべての組）", pairs, "hub")}
${latRow("距離だけ（5,000km以上の組）", long, "dist")}
${latRow("中継点つき・このアプリ（5,000km以上の組）", long, "hub")}

### 距離だけの推定が大きく外れた組

| 組 | 大円距離 | 実測 | 距離だけ | 中継点つき |
| --- | --- | --- | --- | --- |
${worstDist.map((p) => `| ${p.a} ↔ ${p.b} | ${Math.round(p.km).toLocaleString()} km | ${Math.round(p.truth)} ms | ${p.dist} ms | ${p.hub} ms |`).join("\n")}

## 読み方と限界

- CO2 の公式値（Google）は1時間ごとの電力の構成から計算した値で、その送電網の区域の値。Ember は国・州の年平均。米国では州の境と送電網の区域が一致しないので、州単位にしても合わない場所がある
- どちらも「その地域の電力網の平均」で、各社が買っている再エネ電力（PPA など）は含まない
- AWS と Azure は CO2 の公式値を公開していないので、推定の正しさは Google のリージョンでしか確かめられない
- 遅延の実測は Azure の自社回線の中の値。利用者の家や会社からの遅延には、さらにインターネットの区間が加わる
`;

writeFileSync(join(appDir, "eval", "RESULTS.md"), md);
console.log(summaryA.join("\n"));
console.log(latRow("距離だけ", pairs, "dist"));
console.log(latRow("中継点つき", pairs, "hub"));
console.log(latRow("距離だけ 5000km+", long, "dist"));
console.log(latRow("中継点つき 5000km+", long, "hub"));
