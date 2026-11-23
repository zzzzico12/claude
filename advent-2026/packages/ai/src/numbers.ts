// 「数字はコードで計算し、AIには説明だけをさせる」ための照合ツール。
// AI の文章から数字を抜き出し、コードで計算した値（allowed）のどれかと一致するかを調べる。

export interface ExtractedNumber {
  /** 文章中の表記（例: "約1.2万", "45%"） */
  raw: string;
  /** 数値（例: 12000, 45） */
  value: number;
  /** 表記の最小単位の半分。「1.2万」なら 500。丸めた表記を許すのに使う */
  halfUnit: number;
  percent: boolean;
}

const MULTIPLIERS: Record<string, number> = {
  千: 1e3,
  万: 1e4,
  億: 1e8,
  兆: 1e12,
  thousand: 1e3,
  million: 1e6,
  billion: 1e9,
  trillion: 1e12,
  // 「7B」「45M」のように数字の直後に付く英語の略記
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
};

/** 全角数字・全角記号を半角にそろえ、「2万6,669」「1万5000」のような万をはさむ書き方を1つの数（26669、15000）にする */
function normalize(text: string): string {
  return text
    .replace(/[０-９．，－]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/％/g, "%")
    .replace(/(\d+)万(\d{1,3}(?:,\d{3})+|\d{1,4})(?![\d,.])/g, (_, man: string, rest: string) =>
      String(Number(man) * 10_000 + Number(rest.replace(/,/g, ""))),
    );
}

// 1,234.5 / 1234 / -3.2 / 1.2万 / 45% / 45 million / 7B など
// K/M/B/T は数字の直後で、後ろに英字が続かないときだけ単位とみなす（「3D」「5G」などと区別）
const NUMBER_RE =
  /(-)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(?:\s*(千|万|億|兆)|\s+(thousand|million|billion|trillion)\b|([KMBT])(?![A-Za-z]))?\s*(%)?/g;

export function extractNumbers(text: string): ExtractedNumber[] {
  const out: ExtractedNumber[] = [];
  for (const m of normalize(text).matchAll(NUMBER_RE)) {
    const [raw, minus, intPart, frac, jaUnit, enWord, enAbbr, pct] = m;
    const unit = jaUnit ?? enWord ?? enAbbr;
    const decimals = frac ? frac.length : 0;
    const mult = unit ? MULTIPLIERS[unit] : 1;
    const base = Number(`${intPart.replace(/,/g, "")}${frac ? `.${frac}` : ""}`);
    out.push({
      raw: raw.trim(),
      value: (minus ? -1 : 1) * base * mult,
      halfUnit: 0.5 * 10 ** -decimals * mult,
      percent: Boolean(pct),
    });
  }
  return out;
}

export interface CheckNumbersOptions {
  /** 相対誤差の許容（既定 0.5%） */
  relTol?: number;
  /** 照合しない数字（例: 年号や「第1位」の 1）を除くための関数 */
  ignore?: (n: ExtractedNumber) => boolean;
}

export interface CheckNumbersResult {
  ok: boolean;
  checked: ExtractedNumber[];
  /** allowed のどれとも一致しなかった数字。0件なら ok */
  unmatched: ExtractedNumber[];
}

/**
 * AI の文章中の数字が、コードで計算した値のどれかと一致するかを調べる。
 * 「約1.2万」のような丸めた表記は、表記の桁で丸めた範囲内なら一致とみなす。
 * パーセントは 45% → 45 と 0.45 の両方で照合する。
 */
export function checkNumbers(
  text: string,
  allowed: number[],
  { relTol = 0.005, ignore }: CheckNumbersOptions = {},
): CheckNumbersResult {
  const checked = extractNumbers(text).filter((n) => !ignore?.(n));
  const matches = (v: number, halfUnit: number) =>
    allowed.some((a) => Math.abs(v - a) <= Math.max(relTol * Math.abs(a), halfUnit) + 1e-9);
  const unmatched = checked.filter(
    (n) => !matches(n.value, n.halfUnit) && !(n.percent && matches(n.value / 100, n.halfUnit / 100)),
  );
  return { ok: unmatched.length === 0, checked, unmatched };
}

/** 年号らしい 4 桁の整数（1500〜2100）を除くための ignore 関数 */
export const ignoreYears = (n: ExtractedNumber) =>
  Number.isInteger(n.value) && n.value >= 1500 && n.value <= 2100 && !n.raw.includes(",");
