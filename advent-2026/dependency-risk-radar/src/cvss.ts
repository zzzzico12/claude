// CVSS v3.x のベクトル（"CVSS:3.1/AV:N/AC:L/..."）から基本スコアを計算する。
// 計算式は FIRST の CVSS v3.1 仕様書（https://www.first.org/cvss/v3.1/specification-document）の 7.1 節。
import type { Severity } from "./types.js";

const W = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
} as const;

/** 小数第1位への切り上げ（仕様書の Roundup。浮動小数の誤差を避ける版） */
function roundUp(x: number): number {
  const i = Math.round(x * 100000);
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
}

export function cvss3BaseScore(vector: string): number | null {
  if (!/^CVSS:3\.[01]\//.test(vector)) return null;
  const m = Object.fromEntries(vector.split("/").slice(1).map((kv) => kv.split(":"))) as Record<string, string>;
  const av = W.AV[m.AV as keyof typeof W.AV];
  const ac = W.AC[m.AC as keyof typeof W.AC];
  const ui = W.UI[m.UI as keyof typeof W.UI];
  const scope = m.S;
  const c = W.CIA[m.C as keyof typeof W.CIA];
  const i = W.CIA[m.I as keyof typeof W.CIA];
  const a = W.CIA[m.A as keyof typeof W.CIA];
  const prTable = scope === "C" ? { N: 0.85, L: 0.68, H: 0.5 } : { N: 0.85, L: 0.62, H: 0.27 };
  const pr = prTable[m.PR as keyof typeof prTable];
  if ([av, ac, ui, c, i, a, pr].some((x) => x === undefined) || (scope !== "U" && scope !== "C")) return null;

  const iss = 1 - (1 - c) * (1 - i) * (1 - a);
  const impact = scope === "U" ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15;
  if (impact <= 0) return 0;
  const exploitability = 8.22 * av * ac * pr * ui;
  return scope === "U"
    ? roundUp(Math.min(impact + exploitability, 10))
    : roundUp(Math.min(1.08 * (impact + exploitability), 10));
}

export function severityFromScore(score: number | null): Severity {
  if (score === null) return "UNKNOWN";
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MODERATE";
  if (score > 0) return "LOW";
  return "UNKNOWN";
}
