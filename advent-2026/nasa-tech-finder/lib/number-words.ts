// 英語の文に書かれた数（seventy-two、One hundred eighteen、minus 90）を数字として取り出す。
// AI は英語の要約の「seventy-two hours」を日本語で「72時間」と書くので、照合の候補に入れる
const SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALE: Record<string, number> = { hundred: 100, thousand: 1000, million: 1_000_000 };
const WORD = new RegExp(`\\b(?:${[...Object.keys(SMALL), ...Object.keys(SCALE)].join("|")})(?:[\\s-]+(?:and[\\s-]+)?(?:${[...Object.keys(SMALL), ...Object.keys(SCALE)].join("|")}))*\\b`, "gi");

/** 「One hundred eighteen」→ 118 のように、文中の英語の数を数にする */
export function numberWords(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(WORD)) {
    let total = 0,
      cur = 0;
    for (const w of m[0].toLowerCase().split(/[\s-]+/)) {
      if (w === "and") continue;
      if (w in SMALL) cur += SMALL[w];
      else if (w === "hundred") cur = (cur || 1) * 100;
      else {
        total += (cur || 1) * SCALE[w];
        cur = 0;
      }
    }
    out.push(total + cur);
  }
  return out;
}

/** 照合に使う数：数字・英語の数、それぞれの正負（「minus 90」「10-20」の読み違いを防ぐ） */
export function allowedNumbers(texts: string[], extract: (t: string) => number[]): number[] {
  const vals = texts.flatMap((t) => [...extract(t), ...numberWords(t)]);
  return [...new Set(vals.flatMap((v) => [v, -v]))];
}
