// 画面の言語（日本語・英語）。Day06・Day07 と同じ決め方：URL の ?lang= → 前に選んだ言語 → ブラウザの言語
export type Lang = "ja" | "en";
const KEY = "asteroid-size-compare:lang";

function detect(): Lang {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "ja" || q === "en") return q;
  try {
    const s = localStorage.getItem(KEY);
    if (s === "ja" || s === "en") return s;
  } catch {
    // 保存できない環境ではブラウザの言語で決める
  }
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}
export const lang: Lang = detect();

export function switchLang(to: Lang) {
  try {
    localStorage.setItem(KEY, to);
  } catch {
    // URL で切り替わる
  }
  const u = new URL(location.href);
  u.searchParams.set("lang", to);
  location.href = u.toString();
}

const ja = {
  title: "地球に近づく小惑星を身近なサイズで",
  lead: "これから30日に地球に近づく小惑星を、東京タワーや月までの距離に置き換えて見せます。数字はすべて NASA と Wikidata のデータからコードで計算し、AI は置き換えの文章だけを書きます。",
  switchTo: "English",
  summary: (n: number) => `これから30日で、月までの距離の約80倍以内に近づく小惑星：${n}個`,
  nearest: "いちばん近い",
  largest: "いちばん大きい（推定の最大）",
  sortBy: "並べ方",
  sortTime: "日時",
  sortDist: "近い順",
  sortSize: "大きい順",
  colTime: "いちばん近づく日時",
  colName: "名前",
  colSize: "大きさ",
  colLike: "身近な物で",
  colDist: "距離（月までの何倍）",
  colSpeed: "速さ",
  meters: (a: number, b: number) => (a === b ? `約${fmt(a)} m` : `約${fmt(a)}〜${fmt(b)} m`),
  times: (a: number, b: number, counter: string) => (a === b ? `${fmt(a)}${counter}分` : `${fmt(a)}〜${fmt(b)}${counter}分`),
  moonTimes: (x: number) => `${fmt(x)} 倍`,
  kmps: (x: number) => `秒速 ${fmt(x)} km`,
  compareLine: (name: string, what: string, value: number, times: string) => `${name}（${what} ${fmt(value)} m）の ${times}`,
  measured: "測られた大きさ",
  estimated: "明るさからの推定。直径が測られた小惑星では、半分ほどがこの幅の外でした",
  sentryNone: "衝突の可能性は見つかっていない（Sentry の一覧に載っていない）",
  sentryListed: (ip: number, ts: number, range: string) => `Sentry の一覧に載っている：${range}年に衝突する確率 ${pctStr(ip)}（トリノ・スケール ${ts}）`,
  aiTitle: "身近なものに置き換えると（AI）",
  aiLoading: "説明を書いています…（10秒ほど。1度作った説明は保存して使い回します）",
  aiAllMatched: "✓ 文章の中の数字は、すべてコードで計算した数字と一致しました",
  aiUnmatched: (s: string) => `⚠ 計算した数字と照合できなかった数字：${s}`,
  aiNote: "Claude による文章。数字は NASA と Wikidata のデータからコードで計算したもので、文章の数字は自動で照合しています。",
  figSize: "大きさ（同じ縮尺）",
  figSizeNote: "小惑星の円の実線が推定の最小、点線が最大。",
  figDist: "いちばん近づくときの距離",
  figDistNote: (lo: number, hi: number) => (lo === hi ? "" : `軌道の不確かさで、月までの${fmt(lo)}〜${fmt(hi)}倍の幅があります。`),
  earth: "地球",
  moon: "月",
  asteroid: "小惑星",
  factsTitle: "数字（コードで計算）",
  fSize: "大きさ",
  fDist: "距離",
  fSpeed: "速さ",
  fRisk: "衝突のリスク",
  distDetail: (km: number, moon: number, earth: number) => `約${fmt(km)} km（月までの${fmt(moon)}倍、地球の直径の${fmt(earth)}個分）`,
  speedDetail: (kmh: number, sh: number, eo: number) => `時速 約${fmt(kmh)} km（新幹線 E5系の${fmt(sh)}倍、地球の公転の${fmt(eo)}倍）`,
  assumption: "直径が測られていない小惑星は、明るさ（絶対等級 H）と、表面の反射率を 0.05〜0.25 と仮定して「最小〜最大」を出しています（D[km] = 1329 ÷ √反射率 × 10^(−H/5)）。",
  timeSigma: (s: string) => `日時の不確かさ ${sigmaText(s, "ja")}`,
  colon: "：",
  paren: (s: string) => `（${s}）`,
  loading: "NASA のデータを読み込んでいます…",
  error: "データを読み込めませんでした。時間をおいて試してください。",
  objectsAt: (d: string) => `比べる物の大きさは Wikidata（${d} に取得）`,
  pick: "一覧から小惑星を選ぶと、ここに図と説明が出ます。",
  sizeSlider: "大きさ（推定の幅）",
  viewOverview: "全体を見る",
  viewHuman: "人の目線で見上げる",
  vNote: "ドラッグで回転、ホイール・ピンチで拡大。すべて同じ縮尺（1.7 m の人も立っています）。小惑星の形は NASA のベンヌのモデルをもとにしたイメージです。",
  person: "人",
  personSub: "身長 1.7 m",
  compareSub: (what: string, v: number) => `${what} ${fmt(v)} m`,
  tileSize: "大きさ",
  tileDist: "いちばん近づく距離",
  tileSpeed: "速さ",
  tileRisk: "地球にぶつかる？",
  moonX: (x: number) => `月の ${fmt(x)} 倍`,
  speedX: (x: number) => `新幹線の ${fmt(x)} 倍`,
  riskNo: "可能性は見つかっていない",
  riskNoSub: "NASA の衝突リスクの一覧（Sentry）に載っていない",
  riskListed: (ip: string, ts: number) => `確率 ${ip}`,
  riskListedSub: (range: string, ts: number) => `Sentry に載っている（${range}年、トリノ・スケール ${ts}＝${ts === 0 ? "心配はほぼない" : "注意して見守る"}）`,
  aiMore: "AI の説明をくわしく読む",
  credits: "3D モデル：",
  bigger: (x: number) => `小惑星のほうが ${fmt(x)} 倍大きい`,
  same: "ほぼ同じ大きさ",
  smaller: (x: number) => `小惑星は ${fmt(x)} 倍の大きさ`,
  sumShort: (n: number) => `これから30日に近づく小惑星 ${n}個`,
};

type Dict = typeof ja;

const en: Dict = {
  title: "Near-Earth Asteroids at a Familiar Scale",
  lead: "Asteroids passing Earth in the next 30 days, compared with familiar landmarks and the distance to the Moon. All numbers are calculated by code from NASA and Wikidata data; AI only writes the comparisons.",
  switchTo: "日本語",
  summary: (n) => `Asteroids passing within about 80 times the Moon's distance in the next 30 days: ${n}`,
  nearest: "Closest",
  largest: "Largest (upper estimate)",
  sortBy: "Sort",
  sortTime: "Date",
  sortDist: "Closest",
  sortSize: "Largest",
  colTime: "Closest approach (UTC)",
  colName: "Name",
  colSize: "Size",
  colLike: "About the size of",
  colDist: "Distance (× Moon)",
  colSpeed: "Speed",
  meters: (a, b) => (a === b ? `about ${fmt(a)} m` : `about ${fmt(a)}–${fmt(b)} m`),
  times: (a, b) => (a === b ? `${fmt(a)}×` : `${fmt(a)}–${fmt(b)}×`),
  moonTimes: (x) => `${fmt(x)}×`,
  kmps: (x) => `${fmt(x)} km/s`,
  compareLine: (name, what, value, times) => `${times} ${name} (${what} ${fmt(value)} m)`,
  measured: "measured size",
  estimated: "Estimated from brightness. For asteroids with measured diameters, about half fell outside this range",
  sentryNone: "No impact chance found (not on the Sentry list)",
  sentryListed: (ip, ts, range) => `On the Sentry list: ${pctStr(ip)} chance of impact in ${range} (Torino scale ${ts})`,
  aiTitle: "In familiar terms (AI)",
  aiLoading: "Writing the explanation… (about 10 seconds; each one is written once and reused)",
  aiAllMatched: "✓ Every number in the text matches the numbers calculated by code",
  aiUnmatched: (s) => `⚠ Numbers that could not be matched to the calculation: ${s}`,
  aiNote: "Text by Claude. Numbers are calculated by code from NASA and Wikidata data, and the numbers in the text are checked automatically.",
  figSize: "Size (same scale)",
  figSizeNote: "Solid circle: smallest estimate. Dashed: largest.",
  figDist: "Distance at closest approach",
  figDistNote: (lo, hi) => (lo === hi ? "" : `Orbit uncertainty: ${fmt(lo)}–${fmt(hi)} times the Moon's distance.`),
  earth: "Earth",
  moon: "Moon",
  asteroid: "Asteroid",
  factsTitle: "Numbers (calculated by code)",
  fSize: "Size",
  fDist: "Distance",
  fSpeed: "Speed",
  fRisk: "Impact risk",
  distDetail: (km, moon, earth) => `about ${fmt(km)} km (${fmt(moon)}× the Moon's distance, ${fmt(earth)} Earth diameters)`,
  speedDetail: (kmh, sh, eo) => `about ${fmt(kmh)} km/h (${fmt(sh)}× a Shinkansen E5, ${fmt(eo)}× Earth's orbital speed)`,
  assumption: "When the diameter has not been measured, the range comes from brightness (absolute magnitude H) assuming a surface reflectivity of 0.05–0.25 (D[km] = 1329 / √albedo × 10^(−H/5)).",
  timeSigma: (s) => `time uncertainty ${sigmaText(s, "en")}`,
  colon: ": ",
  paren: (s) => ` (${s})`,
  loading: "Loading NASA data…",
  error: "Could not load the data. Please try again later.",
  objectsAt: (d) => `Object sizes from Wikidata (retrieved ${d})`,
  pick: "Pick an asteroid from the list to see the charts and explanation here.",
  sizeSlider: "Size (estimate range)",
  viewOverview: "Overview",
  viewHuman: "Look up as a person",
  vNote: "Drag to rotate, scroll or pinch to zoom. Everything is to the same scale (a 1.7 m person is standing there too). The asteroid's shape is based on NASA's model of Bennu.",
  person: "Person",
  personSub: "1.7 m tall",
  compareSub: (what, v) => `${what} ${fmt(v)} m`,
  tileSize: "Size",
  tileDist: "Closest distance",
  tileSpeed: "Speed",
  tileRisk: "Will it hit Earth?",
  moonX: (x) => `${fmt(x)}× the Moon`,
  speedX: (x) => `${fmt(x)}× a Shinkansen`,
  riskNo: "No chance found",
  riskNoSub: "Not on NASA's impact-risk list (Sentry)",
  riskListed: (ip) => `Probability ${ip}`,
  riskListedSub: (range, ts) => `On the Sentry list (${range}, Torino scale ${ts} = ${ts === 0 ? "no real concern" : "keep watching"})`,
  aiMore: "Read the AI explanation",
  credits: "3D models: ",
  bigger: (x) => `The asteroid is ${fmt(x)}× bigger`,
  same: "About the same size",
  smaller: (x) => `The asteroid is ${fmt(x)}× the size`,
  sumShort: (n) => `${n} asteroids passing in the next 30 days`,
};

export const t: Dict = lang === "en" ? en : ja;

/** 数字の表示（3桁区切り。大きい数は丸めずにそのまま。計算側で有効数字2桁にしてある） */
export function fmt(x: number): string {
  return x.toLocaleString(lang === "ja" ? "ja-JP" : "en-US", { maximumFractionDigits: 6 });
}
/** JPL の時刻の不確かさ（< 00:01、13:36、2_19:21 = 日_時:分）を読みやすく */
export function sigmaText(s: string, l: Lang): string {
  if (s.startsWith("<")) return l === "ja" ? "1分未満" : "under 1 minute";
  const m = s.match(/^(?:(\d+)_)?(\d+):(\d+)$/);
  if (!m) return s;
  const [d, h, mi] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  if (l === "ja") return "±" + [d ? `${d}日` : "", h ? `${h}時間` : "", !d && mi ? `${mi}分` : ""].join("");
  return "±" + [d ? `${d} d` : "", h ? `${h} h` : "", !d && mi ? `${mi} min` : ""].filter(Boolean).join(" ");
}
export function pctStr(p: number): string {
  const v = p * 100;
  return `${v >= 0.01 ? Number(v.toPrecision(2)) : v.toExponential(1)}%`;
}
