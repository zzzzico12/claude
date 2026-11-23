// リージョンの電力の CO2（gCO2/kWh）を Ember から推定する。Google Cloud は公式の値も添える。
import { CARBON } from "./carbon-data.js";
import type { Region } from "./regions.js";

export interface CarbonEstimate {
  /** Ember からの推定値（gCO2/kWh） */
  g: number;
  year: number;
  /** 州単位（米国）か国単位か */
  basis: "state" | "country";
  /** Google Cloud の公式値（あれば） */
  official: { g: number; cfe: number | null; year: number } | null;
}

type YearValues = Readonly<Record<string, number>>;

function latest(values: YearValues | undefined, year?: number): { year: number; g: number } | null {
  if (!values) return null;
  const years = Object.keys(values)
    .map(Number)
    .filter((y) => year === undefined || y === year)
    .sort((a, b) => b - a);
  return years.length ? { year: years[0], g: values[String(years[0])] } : null;
}

export interface EstimateOptions {
  /** 指定した年の値を使う（評価用）。省略すると最新年 */
  year?: number;
  /** 米国でも州を使わず国の値を使う（評価で「国単位だけ」と比べるため） */
  countryOnly?: boolean;
}

export function estimateCarbon(region: Region, opts: EstimateOptions = {}): CarbonEstimate | null {
  const countries = CARBON.country as Readonly<Record<string, YearValues>>;
  const states = CARBON.state as Readonly<Record<string, YearValues>>;
  const byState = region.state && !opts.countryOnly ? latest(states[region.state], opts.year) : null;
  const byCountry = latest(countries[region.iso3], opts.year);
  const base = byState ?? byCountry;
  if (!base) return null;

  let official: CarbonEstimate["official"] = null;
  if (region.provider === "gcp") {
    const google = CARBON.google as Readonly<Record<string, Readonly<Record<string, { g: number; cfe: number | null }>>>>;
    const years = Object.keys(google)
      .map(Number)
      .filter((y) => (opts.year === undefined || y === opts.year) && google[String(y)][region.id])
      .sort((a, b) => b - a);
    if (years.length) official = { ...google[String(years[0])][region.id], year: years[0] };
  }
  return { g: base.g, year: base.year, basis: byState ? "state" : "country", official };
}
