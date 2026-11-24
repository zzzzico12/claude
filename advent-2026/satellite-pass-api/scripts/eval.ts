// 評価：NASA Spot the Station の見える時刻（都市ごとの XML）と、こちらの予測を比べる
//   pnpm eval
// - NASA の XML は data/nasa/ に保存して使い回す（なければ取る）。都市の緯度経度は入っていないので、
//   Open-Meteo の地名検索で取り、data/cities.json に保存する
// - 軌道要素は、手元に保存した CelesTrak の GP（data/celestrak/gp-*.json。なければ取る）
// - 同じ通過の見つけ方：NASA の見え始めの時刻から ±5 分以内で、いちばん近いこちらの通過
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findVisiblePasses, sunElevation, toSatrec, type Gp, type Pass } from "@advent/orbit";
import { toMarkdown } from "@advent/attribution";
import { getGp, UA } from "../lib/gp-source.js";
import { evalSources } from "../lib/sources.js";
import { expandGp } from "@advent/orbit";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(appDir);
const nasaDir = join(appDir, "data", "nasa");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CITIES: { city: string; country: string; code: string; file: string; ja: string }[] = [
  { city: "Sapporo", country: "Japan", code: "JP", file: "INT03", ja: "札幌" },
  { city: "Sendai", country: "Japan", code: "JP", file: "INT03", ja: "仙台" },
  { city: "Niigata", country: "Japan", code: "JP", file: "INT03", ja: "新潟" },
  { city: "Tokyo", country: "Japan", code: "JP", file: "INT03", ja: "東京" },
  { city: "Nagoya", country: "Japan", code: "JP", file: "INT03", ja: "名古屋" },
  { city: "Osaka", country: "Japan", code: "JP", file: "INT03", ja: "大阪" },
  { city: "Hiroshima", country: "Japan", code: "JP", file: "INT03", ja: "広島" },
  { city: "Fukuoka", country: "Japan", code: "JP", file: "INT03", ja: "福岡" },
  { city: "Kagoshima", country: "Japan", code: "JP", file: "INT03", ja: "鹿児島" },
  { city: "Naha", country: "Japan", code: "JP", file: "INT03", ja: "那覇" },
  { city: "London", country: "United_Kingdom", code: "GB", file: "INT05", ja: "ロンドン" },
  { city: "Berlin", country: "Germany", code: "DE", file: "INT02", ja: "ベルリン" },
  { city: "Toronto", country: "Canada", code: "CA", file: "INT01", ja: "トロント" },
  { city: "Sao_Paulo", country: "Brazil", code: "BR", file: "INT01", ja: "サンパウロ" },
  { city: "Cape_Town", country: "South_Africa", code: "ZA", file: "INT04", ja: "ケープタウン" },
  { city: "Singapore", country: "Singapore", code: "SG", file: "INT04", ja: "シンガポール" },
  { city: "Sydney", country: "Australia", code: "AU", file: "INT01", ja: "シドニー" },
];

interface NasaPass {
  start: number; // UTC ミリ秒（分単位）
  durationMin: number; // "< 1" は 0.5 とする
  maxElevation: number;
  enterElevation: number;
  enterDir: string;
  exitElevation: number;
  exitDir: string;
}

async function nasaFile(name: string): Promise<string> {
  const path = join(nasaDir, `XMLsightingData_cities${name}.xml`);
  if (!existsSync(path)) {
    mkdirSync(nasaDir, { recursive: true });
    const res = await fetch(`https://nasa-public-data.s3.amazonaws.com/iss-coords/current/ISS_sightings/XMLsightingData_cities${name}.xml`, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`NASA の ${name} が HTTP ${res.status}`);
    writeFileSync(path, await res.text());
    await sleep(1000);
  }
  return readFileSync(path, "utf8");
}

function parseNasa(xml: string, city: string, country: string): NasaPass[] {
  const out: NasaPass[] = [];
  for (const m of xml.matchAll(/<visible_pass>(.*?)<\/visible_pass>/gs)) {
    const x = m[1];
    const get = (tag: string) => x.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] ?? "";
    if (get("city") !== city || get("country") !== country || get("spacecraft") !== "ISS") continue;
    const [ee, , ed] = get("enters").split(" ");
    const [xe, , xd] = get("exits").split(" ");
    const dur = get("duration_minutes").replace("&lt;", "<");
    out.push({
      start: Date.parse(`${get("utc_date")} ${get("utc_time")} UTC`),
      durationMin: dur.startsWith("<") ? 0.5 : Number(dur),
      maxElevation: Number(get("max_elevation")),
      enterElevation: Number(ee),
      enterDir: ed,
      exitElevation: Number(xe),
      exitDir: xd,
    });
  }
  return out;
}

async function coords(): Promise<Record<string, { lat: number; lon: number; name: string }>> {
  const path = join(appDir, "data", "cities.json");
  const saved: Record<string, { lat: number; lon: number; name: string }> = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  for (const c of CITIES) {
    const key = `${c.city}/${c.code}`;
    if (saved[key]) continue;
    const name = c.city.replace(/_/g, " ").replace("Sao", "São");
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&countryCode=${c.code}`, { headers: { "User-Agent": UA } });
    const r = (await res.json()).results?.[0];
    if (!r) throw new Error(`${name} の座標が見つかりません`);
    saved[key] = { lat: r.latitude, lon: r.longitude, name: `${r.name}, ${r.country}` };
    await sleep(500);
  }
  writeFileSync(path, JSON.stringify(saved, null, 1));
  return saved;
}

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const dirSteps = (a: string, b: string) => {
  const d = Math.abs(DIRS.indexOf(a) - DIRS.indexOf(b)) % 16;
  return Math.min(d, 16 - d);
};
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
};
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(0)}%` : "—");
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : "—");

interface Row {
  city: string;
  nasa: number;
  matched: number;
  extra: number;
  startDiffSec: number[];
  maxDiff: number[];
  enterSame: number;
  enterNear: number;
  exitSame: number;
  exitNear: number;
  durDiffMin: number[];
  byDay: { day: number; startDiffSec: number }[];
  misses: string[];
  extras: string[];
  /** 見つかった通過の、見え始めの太陽の高さ（いちばん明るい側） */
  matchedSun: number[];
}

async function main() {
  const r = await getGp();
  if (!r) throw new Error("軌道要素がありません");
  const iss = expandGp(r.gp).find((g: Gp) => g.NORAD_CAT_ID === 25544)!;
  const satrec = toSatrec(iss)!;
  const epoch = Date.parse(iss.EPOCH + "Z");
  const cs = await coords();
  const files: Record<string, string> = {};
  for (const f of new Set(CITIES.map((c) => c.file))) files[f] = await nasaFile(f);
  const fileDate = readdirSync(nasaDir).length ? new Date().toISOString().slice(0, 10) : "";

  const rows: Row[] = [];
  for (const c of CITIES) {
    const nasa = parseNasa(files[c.file], c.city, c.country);
    if (!nasa.length) continue;
    const loc = cs[`${c.city}/${c.code}`];
    const from = Math.min(...nasa.map((p) => p.start)) - 2 * 3600_000;
    const to = Math.max(...nasa.map((p) => p.start)) + 2 * 3600_000;
    const ours = findVisiblePasses(satrec, { lat: loc.lat, lon: loc.lon }, new Date(from), new Date(to));
    const used = new Set<Pass>();
    const row: Row = { city: `${c.ja}（${c.city.replace(/_/g, " ")}）`, nasa: nasa.length, matched: 0, extra: 0, startDiffSec: [], maxDiff: [], enterSame: 0, enterNear: 0, exitSame: 0, exitNear: 0, durDiffMin: [], byDay: [], misses: [], extras: [], matchedSun: [] };
    for (const n of nasa) {
      // NASA の時刻は分単位なので、こちらも分の頭からの差で比べる（±5分以内でいちばん近いもの）
      const cand = ours.filter((o) => !used.has(o) && Math.abs(o.start.time.getTime() - n.start) <= 5 * 60_000).sort((a, b) => Math.abs(a.start.time.getTime() - n.start) - Math.abs(b.start.time.getTime() - n.start))[0];
      if (!cand) {
        row.misses.push(`${new Date(n.start).toISOString().slice(5, 16)}Z 最大${n.maxElevation}° ${n.durationMin}分`);
        continue;
      }
      used.add(cand);
      row.matched++;
      const sunAt = (t: Date) => sunElevation({ lat: loc.lat, lon: loc.lon }, t);
      row.matchedSun.push(Math.max(sunAt(cand.start.time), sunAt(cand.end.time)));
      const ourStartMin = Math.floor(cand.start.time.getTime() / 60_000) * 60_000;
      const d = (ourStartMin - n.start) / 1000;
      row.startDiffSec.push(d);
      row.byDay.push({ day: Math.floor((n.start - epoch) / 86400_000), startDiffSec: (cand.start.time.getTime() - n.start - 30_000) / 1000 });
      row.maxDiff.push(Math.round(cand.max.elevation) - n.maxElevation);
      const es = dirSteps(cand.start.direction, n.enterDir);
      const xs = dirSteps(cand.end.direction, n.exitDir);
      if (es === 0) row.enterSame++;
      if (es <= 1) row.enterNear++;
      if (xs === 0) row.exitSame++;
      if (xs <= 1) row.exitNear++;
      if (n.durationMin >= 1) row.durDiffMin.push(cand.durationSec / 60 - n.durationMin);
    }
    // こちらにだけある通過（NASA の期間内）
    const nFrom = Math.min(...nasa.map((p) => p.start)) - 60_000;
    const nTo = Math.max(...nasa.map((p) => p.start)) + 60_000;
    const extras = ours.filter((o) => !used.has(o) && o.start.time.getTime() >= nFrom && o.start.time.getTime() <= nTo);
    row.extra = extras.length;
    row.extras = extras.map((o) => `${o.start.time.toISOString().slice(5, 16)}Z 最大${o.max.elevation.toFixed(1)}° ${o.durationSec}秒・太陽の高さ ${Math.max(sunElevation({ lat: loc.lat, lon: loc.lon }, o.start.time), sunElevation({ lat: loc.lat, lon: loc.lon }, o.end.time)).toFixed(1)}°（${o.endsBy === "shadow" ? "影に入って終わる" : o.endsBy === "daylight" ? "空が明るくなって終わる" : "地平線へ"}）`);
    rows.push(row);
  }

  const all = (k: "startDiffSec" | "maxDiff" | "durDiffMin") => rows.flatMap((r) => r[k]);
  const sum = (k: "nasa" | "matched" | "extra" | "enterSame" | "enterNear" | "exitSame" | "exitNear") => rows.reduce((s, r) => s + r[k], 0);
  const absMed = (xs: number[]) => median(xs.map(Math.abs));
  const within = (xs: number[], lim: number) => xs.filter((x) => Math.abs(x) <= lim).length;

  const S = all("startDiffSec");
  const M = all("maxDiff");
  const D = all("durDiffMin");
  const byDay = new Map<number, number[]>();
  rows.flatMap((r) => r.byDay).forEach((b) => byDay.set(b.day, [...(byDay.get(b.day) ?? []), Math.abs(b.startDiffSec)]));

  const md = `# Day 07 の評価結果

- 実行日：${new Date().toISOString().slice(0, 10)}（\`pnpm eval\`）
- 比べた相手：NASA Spot the Station の見える時刻（都市ごとの XML、ISS のみ。${fileDate} 取得）
- こちらの予測：CelesTrak の ISS の軌道要素（元期 ${iss.EPOCH.slice(0, 16)}Z）から、\`packages/orbit\` の \`findVisiblePasses\` で計算
- 「見える」の条件：高さ10度以上・観測地の太陽が地平線の6度以上下・衛星に日が当たっている（円柱の影で近似）
- 同じ通過の見つけ方：NASA の見え始めから ±5 分以内で、いちばん近いこちらの通過
- 都市の緯度経度：NASA の XML にないので、Open-Meteo の地名検索で取った（市役所などの代表点。数 km ずれうる）

## 1. まとめ（${rows.length}都市）

| 項目 | 結果 |
| --- | --- |
| NASA の通過のうち、こちらでも見つかった | ${sum("matched")} / ${sum("nasa")}（${pct(sum("matched"), sum("nasa"))}） |
| こちらにだけある通過（NASA の期間内） | ${sum("extra")} |
| 見え始めの時刻が同じ分 | ${within(S, 0)} / ${S.length}（${pct(within(S, 0), S.length)}）、±1分以内 ${pct(within(S, 60), S.length)} |
| 最大の高さの差 | 中央値 ${f1(absMed(M))} 度、±2度以内 ${pct(within(M, 2), M.length)}、最大 ${Math.max(...M.map(Math.abs))} 度 |
| 現れる方角（16方位）が同じ | ${pct(sum("enterSame"), sum("matched"))}（隣の方位まで含めると ${pct(sum("enterNear"), sum("matched"))}） |
| 消える方角（16方位）が同じ | ${pct(sum("exitSame"), sum("matched"))}（隣の方位まで含めると ${pct(sum("exitNear"), sum("matched"))}） |
| 見える時間の差（NASA が1分以上のもの） | 中央値 ${f1(absMed(D))} 分 |

## 2. 都市ごと

| 都市 | NASA の通過 | 見つかった | こちらだけ | 見え始めが同じ分 | 最大の高さの差（中央値） | 現れる方角が同じ | 消える方角が同じ |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.map((r) => `| ${r.city} | ${r.nasa} | ${r.matched} | ${r.extra} | ${within(r.startDiffSec, 0)} / ${r.startDiffSec.length} | ${f1(absMed(r.maxDiff))} 度 | ${pct(r.enterSame, r.matched)} | ${pct(r.exitSame, r.matched)} |`).join("\n")}

## 3. 軌道要素の元期からの日数と、見え始めのずれ

NASA の時刻は分単位なので、NASA の時刻に30秒を足したもの（分の真ん中）との差の絶対値。

| 元期から | 通過の数 | ずれの中央値 | ずれの最大 |
| --- | --- | --- | --- |
${[...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([d, xs]) => `| ${d < 0 ? `${-d}日前` : `${d}日後`} | ${xs.length} | ${f1(median(xs))} 秒 | ${f1(Math.max(...xs))} 秒 |`).join("\n")}

## 4. 見つからなかった通過

${rows.filter((r) => r.misses.length).map((r) => `- ${r.city}：${r.misses.join("、")}`).join("\n") || "なし"}

## 5. こちらにだけある通過

NASA と一致した通過では、見え始め・見え終わりの太陽の高さ（明るいほう）は最も高くて ${f1(Math.max(...rows.flatMap((r) => r.matchedSun)))}° だった（中央値 ${f1(median(rows.flatMap((r) => r.matchedSun)))}°）。

${rows.filter((r) => r.extras.length).map((r) => `- ${r.city}：${r.extras.join("、")}`).join("\n") || "なし"}

## 出典（評価だけに使うデータ）

${toMarkdown(evalSources)}
`;
  mkdirSync(join(appDir, "eval"), { recursive: true });
  writeFileSync(join(appDir, "eval", "RESULTS.md"), md);
  console.log(md);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
