// Claude に「どこの国の、何のための衛星か」を解説させる。
// 軌道の数字（高さ・周期・傾き）はコードで計算して渡し、解説の数字は照合する
import { checkNumbers, generateText, ignoreYears } from "@advent/ai";
import type { Gp } from "@advent/orbit";
import { factsOf, type Catalog, type UcsRecord } from "./facts.js";

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

export async function explain(gp: Gp, catalog: Catalog, ucs: UcsRecord | undefined) {
  const facts = factsOf(gp, catalog, ucs);
  const text = await generateText({
    label: "satellite-tracker-3d/explain",
    system: SYSTEM,
    prompt: `事実（JSON）：\n${JSON.stringify(facts, null, 1)}`,
  });
  // 照合してよい数字：事実に出てくる数字すべて。衛星の名前の中の番号（STARLINK-1234 など）は照合しない
  const allowed = (JSON.stringify(facts).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const known = [...allowed, ...allowed.map(Math.abs)];
  const body = text.replace(/[A-Za-z][A-Za-z0-9]*[-‐ ]?\d+[A-Za-z0-9-]*/g, " ");
  const check = checkNumbers(body, known, {
    ignore: (n) => ignoreYears(n) || (Number.isInteger(n.value) && Math.abs(n.value) <= 10 && !n.percent),
  });
  return { text, unmatchedNumbers: check.unmatched.map((n) => n.raw), facts };
}
