// Claude に「どこの国の、何のための衛星か」を解説させる。
// 軌道の数字（高さ・周期・傾き）はコードで計算して渡し、解説の数字は照合する
import { checkNumbers, generateText, ignoreYears } from "@advent/ai";
import type { Gp } from "@advent/orbit";
import { factsEn, factsOf, type Catalog, type UcsRecord } from "./facts.js";

export type { Catalog, UcsRecord } from "./facts.js";

const SYSTEM = `あなたは人工衛星に詳しい科学ライターです。3D の地球儀で利用者がクリックした衛星について、「どこの国（組織）の、何のための衛星か」を、宇宙に詳しくない人向けに日本語で解説します。

渡すもの：
- 衛星カタログ（CelesTrak SATCAT）の所有者・打ち上げ日
- UCS Satellite Database の項目（2023年5月1日版。載っていない衛星もある）
- 軌道の数字（コードが軌道要素から計算した値）

守ること：
- 根拠は渡された事実と、衛星の名前から一般に知られていること（例：Starlink は SpaceX の通信衛星網）だけ。わからないことは「公開されている情報からはわからない」と書く
- 数字は渡された値をそのまま書く。計算し直したり、新しい数字を作ったりしない
- UCS に載っていない衛星は、目的を断定しない（「名前から〜と考えられる」）
- 軍事・偵察の可能性がある衛星は、事実として公表されている範囲にとどめ、推測で用途を書かない
- 3段落、全体で250字程度。見出しや箇条書きは使わない：
  1. どこの国（組織）の、何の衛星か
  2. 軌道の特徴（高さ・1周の時間・傾き）が、その目的とどう関係するか
  3. 同じ種類の稼働中の衛星の数（渡した値）に触れて、宇宙の混み具合との関係を一言`;

const SYSTEM_EN = `You are a science writer who knows satellites well. A user clicked a satellite on a 3D globe. Explain, in plain English for people who are not space experts, which country (organization) it belongs to and what it is for.

You are given:
- The owner and launch date from the satellite catalog (CelesTrak SATCAT)
- Fields from the UCS Satellite Database (edition of 1 May 2023; some satellites are not listed)
- Orbit numbers (computed by code from the orbital elements)

Rules:
- Base everything only on the given facts and on what is generally known from the satellite's name (e.g. Starlink is SpaceX's communications network). If something is unknown, say "it is not clear from public information"
- Write numbers exactly as given. Do not recalculate or invent new numbers
- If the satellite is not in UCS, do not state its purpose as fact ("the name suggests ...")
- For satellites that may be military or reconnaissance, stay within publicly stated facts; do not speculate about their use
- Three paragraphs, about 120 words in total. No headings or bullet points:
  1. Which country (organization) and what kind of satellite
  2. How the orbit (altitude, period, inclination) relates to its purpose
  3. Mention the number of active satellites in the same category (the given value) and add one remark on how crowded space is`;

export type Lang = "ja" | "en";

/** 衛星の名前の中の番号（STARLINK-1234・NOAA 20 など）。照合から外す */
export const NAME_NUMBER: Record<Lang, RegExp> = {
  ja: /[A-Za-z][A-Za-z0-9]*[-‐ ]?\d+[A-Za-z0-9-]*/g,
  // 英語では「about 550」も当たってしまうので、大文字の名前か、ハイフンでつながったものだけ
  en: /\b(?:[A-Z]{2,}[A-Z0-9]*[-‐ ]?\d+|[A-Z][A-Za-z0-9]*[-‐]\d+)[A-Za-z0-9-]*/g,
};

export async function explain(gp: Gp, catalog: Catalog, ucs: UcsRecord | undefined, lang: Lang = "ja") {
  const facts = lang === "en" ? factsEn(gp, catalog, ucs) : factsOf(gp, catalog, ucs);
  const text = await generateText({
    label: `satellite-tracker-3d/explain${lang === "en" ? "-en" : ""}`,
    system: lang === "en" ? SYSTEM_EN : SYSTEM,
    prompt: lang === "en" ? `Facts (JSON):\n${JSON.stringify(facts, null, 1)}` : `事実（JSON）：\n${JSON.stringify(facts, null, 1)}`,
  });
  // 照合してよい数字：事実に出てくる数字すべて。衛星の名前の中の番号（STARLINK-1234 など）は照合しない
  const allowed = (JSON.stringify(facts).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const known = [...allowed, ...allowed.map(Math.abs)];
  const body = text.replace(NAME_NUMBER[lang], " ");
  const check = checkNumbers(body, known, {
    ignore: (n) => ignoreYears(n) || (Number.isInteger(n.value) && Math.abs(n.value) <= 10 && !n.percent),
  });
  return { text, unmatchedNumbers: check.unmatched.map((n) => n.raw), facts };
}
