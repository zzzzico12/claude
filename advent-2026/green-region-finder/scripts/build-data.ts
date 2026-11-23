// 事前のデータづくり：Ember と Google Cloud の公開データから、アプリが使う値だけを lib/carbon-data.ts に書き出す。
//   pnpm data
// 元の CSV は data/（Git管理外）に保存し、すでにあれば取り直さない。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { REGIONS } from "../lib/regions.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(appDir, "data");

const EMBER_COUNTRY_URL =
  "https://files.ember-energy.org/public-downloads/generation/outputs/release_generation_yearly_global.csv";
const EMBER_US_URL =
  "https://files.ember-energy.org/public-downloads/generation/outputs/release_us_subnational_generation_yearly.csv";
const GOOGLE_URL = (y: number) =>
  `https://raw.githubusercontent.com/GoogleCloudPlatform/region-carbon-info/main/data/yearly/${y}.csv`;
const GOOGLE_YEARS = [2022, 2023, 2024, 2025];
// Azure のリージョン間の往復時間の実測値（P50、30日間）。Microsoft Learn の記事の元の Markdown（CC BY 4.0）に CSV が入っている
const AZURE_LATENCY_URL =
  "https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/articles/networking/azure-network-latency.md";

async function download(url: string, file: string) {
  if (existsSync(file)) return;
  mkdirSync(dirname(file), { recursive: true });
  process.stderr.write(`取得: ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} が HTTP ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

/** 引用符つきの CSV を1行ずつ読む（Ember の CSV は値にカンマを含む列がある） */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = split(l);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

async function main() {
  const countryFile = join(dataDir, "ember-country.csv");
  const usFile = join(dataDir, "ember-us.csv");
  await download(EMBER_COUNTRY_URL, countryFile);
  await download(EMBER_US_URL, usFile);
  for (const y of GOOGLE_YEARS) await download(GOOGLE_URL(y), join(dataDir, `google-${y}.csv`));

  const needCountries = new Set(REGIONS.map((r) => r.iso3));
  const needStates = new Set(REGIONS.flatMap((r) => (r.state ? [r.state] : [])));
  const INTENSITY = "Emissions intensity (gCO2e/kWh)";

  // 国別・州別：年 → gCO2/kWh（2019年以降）
  const country: Record<string, Record<string, number>> = {};
  for (const row of parseCsv(readFileSync(countryFile, "utf8"))) {
    if (row["Electricity source"] !== "Total generation" || !row[INTENSITY]) continue;
    const iso = row["ISO 3 code"];
    if (!needCountries.has(iso) || Number(row.Year) < 2019) continue;
    (country[iso] ??= {})[row.Year] = Math.round(Number(row[INTENSITY]) * 10) / 10;
  }
  const state: Record<string, Record<string, number>> = {};
  for (const row of parseCsv(readFileSync(usFile, "utf8"))) {
    if (row["Electricity source"] !== "Total generation" || !row[INTENSITY]) continue;
    const code = row["State code"];
    if (!needStates.has(code) || Number(row.Year) < 2019) continue;
    (state[code] ??= {})[row.Year] = Math.round(Number(row[INTENSITY]) * 10) / 10;
  }
  const missing = [...needCountries].filter((c) => !country[c]).concat([...needStates].filter((s) => !state[s]));
  if (missing.length) throw new Error(`Ember に値がない: ${missing.join(", ")}`);

  // Google Cloud：年 → リージョン → { 送電網の CO2, CFE% }
  const google: Record<string, Record<string, { g: number; cfe: number | null }>> = {};
  for (const y of GOOGLE_YEARS) {
    for (const row of parseCsv(readFileSync(join(dataDir, `google-${y}.csv`), "utf8"))) {
      const g = Number(row["Grid carbon intensity (gCO2eq / kWh)"]);
      if (!row["Google Cloud Region"] || !Number.isFinite(g) || g <= 0) continue;
      const cfe = row["Google CFE"] ? Number(row["Google CFE"]) : null;
      (google[y] ??= {})[row["Google Cloud Region"]] = { g, cfe: Number.isFinite(cfe) ? cfe : null };
    }
  }

  // Azure の実測の往復時間：表示名（"Japan East"）を ID（"japaneast"）にして、所在地の分かるリージョンだけ残す
  const latencyFile = join(dataDir, "azure-network-latency.md");
  await download(AZURE_LATENCY_URL, latencyFile);
  const md = readFileSync(latencyFile, "utf8");
  const measuredOn = md.match(/dataset dates from \*([^*]+)\*/)?.[1] ?? "";
  const csv = md.match(/```csv\n([\s\S]*?)```/)?.[1];
  if (!csv) throw new Error("Azure の往復時間の CSV が見つかりません");
  const known = new Set(REGIONS.filter((r) => r.provider === "azure").map((r) => r.id));
  const toId = (name: string) => name.toLowerCase().replace(/\s+/g, "");
  const table = parseCsv(csv);
  const ids = Object.keys(table[0]).slice(1).map(toId).filter((id) => known.has(id));
  const matrix: Record<string, Record<string, number>> = {};
  for (const row of table) {
    const from = toId(row.Source);
    if (!known.has(from)) continue;
    for (const [name, v] of Object.entries(row)) {
      const to = toId(name);
      if (name === "Source" || !known.has(to) || from === to || !v) continue;
      (matrix[from] ??= {})[to] = Number(v);
    }
  }
  writeFileSync(
    join(appDir, "lib", "latency-data.ts"),
    `// このファイルは scripts/build-data.ts が作る（手で編集しない）。作成: ${new Date().toISOString().slice(0, 10)}
// Azure のリージョン間の往復時間（ミリ秒、P50）。測定: ${measuredOn} までの30日間
// 出典: Microsoft Learn「Azure network round-trip latency statistics」（CC BY 4.0）
export const AZURE_RTT_MEASURED_ON = ${JSON.stringify(measuredOn)};
export const AZURE_RTT: Readonly<Record<string, Readonly<Record<string, number>>>> = ${JSON.stringify(matrix)};
`,
  );
  process.stderr.write(`書き出し: lib/latency-data.ts（Azure ${ids.length} リージョン、${measuredOn}）\n`);

  const out = `// このファイルは scripts/build-data.ts が作る（手で編集しない）。作成: ${new Date().toISOString().slice(0, 10)}
// Ember: 国別・米国の州別の電力1kWhあたりの CO2（gCO2e/kWh）。CC BY 4.0
// Google Cloud: リージョンごとの送電網の CO2（gCO2eq/kWh）と CFE（カーボンフリー電力の割合）。Apache 2.0
export const CARBON = ${JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), country, state, google }, null, 1)} as const;
`;
  writeFileSync(join(appDir, "lib", "carbon-data.ts"), out);
  process.stderr.write(
    `書き出し: lib/carbon-data.ts（国 ${Object.keys(country).length}、州 ${Object.keys(state).length}、Google ${Object.entries(google)
      .map(([y, v]) => `${y}年 ${Object.keys(v).length}`)
      .join("・")}）\n`,
  );
}

main();
