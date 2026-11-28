// 「身近なものへの置き換え」の説明（AI）。数字はコードが計算したものだけを使わせ、照合する
import { checkNumbers, generateObject, ignoreYears } from "@advent/ai";
import { z } from "zod";
import { allowedNumbers, type Approach, type Facts } from "./compare.js";
import type { SentryEntry } from "./jpl.js";

export type Lang = "ja" | "en";

/** 返す形。説明（describe）も言語に合わせる（日本語の説明だと、英語の指示でも日本語で書いてしまうため） */
const schemaFor = (lang: Lang) =>
  lang === "ja"
    ? z.object({
        headline: z.string().describe("ひとことで（1文）"),
        size: z.string().describe("大きさを身近な物で（1〜2文）"),
        distance: z.string().describe("距離を身近な物で（1〜2文）"),
        speed: z.string().describe("速さを身近な物で（1文）"),
        calm: z.string().describe("怖がりすぎないための一言（事実にもとづいて1〜2文）"),
      })
    : z.object({
        headline: z.string().describe("One-sentence summary, in English"),
        size: z.string().describe("Size in familiar terms (1-2 sentences, English)"),
        distance: z.string().describe("Distance in familiar terms (1-2 sentences, English)"),
        speed: z.string().describe("Speed in familiar terms (1 sentence, English)"),
        calm: z.string().describe("A calm, fact-based note so readers don't over-worry (1-2 sentences, English)"),
      });
export const ExplainSchema = schemaFor("ja");
export type Explanation = z.infer<typeof ExplainSchema>;

const SYSTEM: Record<Lang, string> = {
  ja: `あなたは、地球に近づく小惑星のニュースを、子どもにもわかるように身近なものに置き換えて説明する案内役です。
- 数字は、渡された facts にある数字だけを使う。計算し直したり、新しい数字を作ったりしない（「約」をつけるのはよい）
- 大きさは「最小〜最大」の幅があることを必ず伝える（明るさからの推定のため。measured が true なら測られた値）
- 比べる物は sizeComparisons の中から、いちばん想像しやすいものを1〜2個選ぶ
- 距離は「月までの距離の何倍」を中心に。距離にも幅（moonMin〜moonMax）があれば触れてよい
- calm は事実にもとづく：sentry が null なら「これから100年、地球に衝突する可能性は見つかっていない（NASA の Sentry の一覧に載っていない）」。sentry があれば、確率を「約○%（約○分の1）」の形で（impactProbabilityPercent と oneIn をそのまま使う）、年の範囲とトリノ・スケールとあわせて伝え、0 なら心配はほぼないと言う。0.00159 や 5.593e-8 のような書き方はしない
- あおらない。「危険」「脅威」などの言葉は使わない。やさしい日本語で`,
  en: `You explain near-Earth asteroid flybys so that a child can picture them, by comparing them with familiar things.
- Use only numbers that appear in the facts. Do not recalculate or invent numbers ("about" is fine).
- Always say the size is a range (estimated from brightness), unless measured is true.
- Pick one or two of the most relatable objects from sizeComparisons.
- For distance, focus on "times the distance to the Moon"; you may mention the range (moonMin to moonMax).
- calm must follow the facts: if sentry is null, say no chance of hitting Earth has been found for the next 100 years (it is not on NASA's Sentry list). If sentry exists, state the probability as "about X% (about 1 in N)" using impactProbabilityPercent and oneIn exactly, with the years and the Torino scale; Torino 0 means essentially no concern. Never write raw forms like 0.00159 or 5.593e-8.
- Do not sensationalize; avoid words like "dangerous" or "threat". Plain English.`,
};

/** 確率を読みやすく（コードで丸める）：0.0015891889 → 0.16（%）、5.593e-8 → 0.0000056（%） */
export const probPercent = (p: number) => Number((p * 100).toPrecision(2));
/** 「何分の1」：0.0015891889 → 630、5.593e-8 → 18000000 */
export const oneIn = (p: number) => Number((1 / p).toPrecision(2));

/** AI に渡す事実（名前と数字。比べる物は言語に合わせた名前で） */
export function factsForAi(a: Approach, f: Facts, sentry: SentryEntry | null, lang: Lang) {
  const when = new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-GB", {
    timeZone: lang === "ja" ? "Asia/Tokyo" : "UTC",
    month: lang === "ja" ? "numeric" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date(a.time));
  return {
    name: a.fullname,
    closestApproach: when,
    sizeMeters: { min: f.size.min, max: f.size.max, measured: f.size.measured },
    sizeComparisons: f.sizeComparisons.map((c) => ({ object: c.name[lang], [lang === "ja" ? "objectMeasure" : "measure"]: `${c.what[lang]} ${c.value} m`, timesMin: c.ratio.min, timesMax: c.ratio.max, counter: lang === "ja" ? c.counter : undefined })),
    distance: { km: f.distance.km, timesMoonDistance: f.distance.moon, moonMin: f.distance.moonMin, moonMax: f.distance.moonMax, earthDiameters: f.distance.earthDiameters },
    speed: { kmPerSecond: f.speed.kmPerS, kmPerHour: f.speed.kmPerH, timesShinkansenE5: f.speed.shinkansen, timesEarthOrbitalSpeed: f.speed.earthOrbit },
    sentry: sentry ? { impactProbabilityPercent: probPercent(sentry.ip), oneIn: oneIn(sentry.ip), torinoScale: sentry.ts, years: sentry.range } : null,
  };
}

export async function explainApproach(a: Approach, f: Facts, sentry: SentryEntry | null, lang: Lang): Promise<{ explanation: Explanation; unmatchedNumbers: string[] }> {
  const facts = factsForAi(a, f, sentry, lang);
  const explanation = await generateObject({
    label: "asteroid-size-compare/explain",
    system: SYSTEM[lang],
    prompt: `${lang === "ja" ? "日本語で書いてください。" : "Write in English."}\nfacts:\n${JSON.stringify(facts, null, 1)}`,
    schema: schemaFor(lang),
    maxTokens: 1500,
  });
  return { explanation, unmatchedNumbers: checkExplanation(explanation, a, f, sentry) };
}

/** 説明の数字が、計算した数字にあるかを照合する（年号と10以下の整数、名前の中の数字は除く） */
export function checkExplanation(e: Explanation, a: Approach, f: Facts, sentry: SentryEntry | null): string[] {
  const allowed = allowedNumbers(f, a);
  if (sentry) allowed.push(sentry.ip, probPercent(sentry.ip), oneIn(sentry.ip), sentry.ts, ...sentry.range.split("-").map(Number));
  // 100年（Sentry の対象の期間）も通す。「2087-2124」のような範囲の「-2124」も通すよう、正負の両方
  allowed.push(100);
  for (const v of [...allowed]) allowed.push(-v);
  // 名前の中の数字（499582 (2010 TH19) の 19 など）は数えない。長い名前から順に取り除く
  const inner = a.fullname.match(/\(([^)]+)\)/)?.[1] ?? "";
  let text = [e.headline, e.size, e.distance, e.speed, e.calm].join("\n");
  for (const n of [a.fullname, inner, a.des].filter(Boolean).sort((x, y) => y.length - x.length)) text = text.split(n).join(" ");
  return checkNumbers(text, allowed, { relTol: 0.01, ignore: (n) => ignoreYears(n) || (Number.isInteger(n.value) && Math.abs(n.value) <= 10) }).unmatched.map((n) => n.raw);
}
