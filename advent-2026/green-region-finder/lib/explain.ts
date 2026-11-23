// Claude に、提案の理由と注意点を説明させる。数字はコードが出したものを渡し、説明の数字は照合する。
import { checkNumbers, generateText } from "@advent/ai";
import { recommend, REQUIREMENTS, type Candidate, type Query } from "./recommend.js";
import { COUNTRY_JA, PROVIDER_LABEL } from "./regions.js";

const SYSTEM = `あなたはクラウドインフラと電力の脱炭素に詳しいエンジニアです。利用者の条件に合うクラウドのリージョンを、電力の CO2 が少ない順に並べた結果があり、順番はすでにコードが決めています。あなたの役割は、その結果を開発者向けに日本語で説明することです。

守ること：
- 根拠は渡された事実だけ。数字（gCO2/kWh、ミリ秒、削減率）は渡された値をそのまま書き、計算し直したり新しい数字を作ったりしない。
- 順番を変えたり、異議を唱えたりしない。
- 次の3段落で書く（見出しや箇条書きは使わない。全体で300字程度）：
  1. 1位のリージョンを選ぶと、いちばん近いリージョンと比べて何が変わるか（CO2 と遅延）
  2. なぜそのリージョンの電力の CO2 が少ないのか、一般的に知られている電源の特徴（水力・原子力・再エネなど）に触れて簡潔に。ただし数字は書かない
  3. 注意点：CO2 は Ember の年平均からの推定であること（公式値がある場合はそれも書く）、各社の再エネ購入（PPA など）は含まないこと、遅延は推定であること`;

function fact(c: Candidate) {
  return {
    クラウド: PROVIDER_LABEL[c.region.provider],
    リージョン: c.region.id,
    所在地: `${c.region.city}（${COUNTRY_JA[c.region.iso3] ?? c.region.iso3}）`,
    "CO2（gCO2/kWh、推定）": c.carbon.g,
    推定の単位: `${c.carbon.year}年の${c.carbon.basis === "state" ? "州" : "国"}の平均`,
    ...(c.carbon.official
      ? { "Google の公式値（gCO2/kWh）": c.carbon.official.g, 公式値の年: c.carbon.official.year }
      : {}),
    "推定の遅延（ms）": c.rttMs,
  };
}

export async function explain(q: Query) {
  const rec = recommend(q);
  if (!rec.ranked.length || !rec.nearest) return null;
  const top = rec.ranked.slice(0, 3);
  const facts = {
    要件: REQUIREMENTS[q.requirement].label,
    "遅延の上限（ms）": REQUIREMENTS[q.requirement].maxRttMs ?? "なし",
    条件を満たすリージョンの数: rec.ranked.length,
    いちばん近いリージョン: fact(rec.nearest),
    "CO2 の少ない順の上位": top.map(fact),
    "1位を選んだときの CO2 の削減率（%）": rec.savings ? Math.round(rec.savings.ratio * 100) : 0,
    "1位を選んだときの遅延の増え方（ms）": rec.savings?.extraMs ?? 0,
  };
  const text = await generateText({
    label: "green-region-finder/explain",
    system: SYSTEM,
    prompt: `事実（JSON）：\n${JSON.stringify(facts, null, 2)}`,
  });
  // 照合してよい数字：事実に出てくる数字すべて
  const allowed = JSON.stringify(facts).match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const check = checkNumbers(text.replace(/[a-z]+-[a-z]+\d+/g, " "), allowed, {
    ignore: (n) => Number.isInteger(n.value) && Math.abs(n.value) <= 10 && !n.percent,
  });
  return { text, unmatchedNumbers: check.unmatched.map((n) => n.raw) };
}
