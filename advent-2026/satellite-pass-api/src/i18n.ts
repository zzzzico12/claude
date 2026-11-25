// 画面の言語（日本語・英語）。Day06 と同じ決め方：URL の ?lang= → 前に選んだ言語 → ブラウザの言語
export type Lang = "ja" | "en";

const STORAGE_KEY = "satellite-pass-api:lang";

function detect(): Lang {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "ja" || q === "en") return q;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ja" || saved === "en") return saved;
  } catch {
    // 保存できない環境ではブラウザの言語で決める
  }
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export const lang: Lang = detect();

export function switchLang(to: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, to);
  } catch {
    // 保存できなくても URL で切り替わる
  }
  const url = new URL(location.href);
  url.searchParams.set("lang", to);
  location.href = url.toString();
}

const DIR_JA: Record<string, string> = {
  N: "北", NNE: "北北東", NE: "北東", ENE: "東北東", E: "東", ESE: "東南東", SE: "南東", SSE: "南南東",
  S: "南", SSW: "南南西", SW: "南西", WSW: "西南西", W: "西", WNW: "西北西", NW: "北西", NNW: "北北西",
};

const ja = {
  title: "衛星の通過予測API",
  description: "場所を入れると、ISS などの人工衛星が見える時刻・方角・高さと、その時間の雲の予報を返す API です。",
  lead: "場所を入れると、ISS などが見える時刻・方角・高さと雲の予報を返します。計算はすべてコードで、AI は質問の読み取りと答えの文章だけ。",
  tabSearch: "通過を調べる",
  tabAsk: "AI に聞く",
  tabApi: "API の使い方",
  apiIntro: "このページの中身は、下の3つの API です。キーは不要で、ほかのサイトやスクリプトからも呼べます（CORS を許可）。コマンドは今の入力に合わせて変わり、実行結果はこの画面で実際に受け取った応答です。",
  apiPassesDesc: "見える通過の、時刻（UTC と観測地の時刻）・方角・高さ・雲量・見やすさの点数と順位を返します。",
  apiParams: [
    ["place", "地名（例：札幌市、東京都、Tokyo）。Open-Meteo で緯度経度にする"],
    ["lat, lon", "緯度・経度（度）。place の代わり"],
    ["sat", "NORAD 番号か名前（ISS・天宮・ハッブルなど）。既定は ISS"],
    ["days", "1〜7（既定 7）"],
    ["lang", "ja か en（地名の言語）"],
    ["path", "1 にすると、各通過に空の通り道（5秒ごとの [秒, 方位角, 高さ, 見えるか]）を付ける。この画面のドームはこれで描いている"],
  ] as [string, string][],
  apiAskDesc: "質問に自然文で答えます。AI は質問から場所・日数・衛星を読み取り、答えを文章にするだけで、計算と順位付けはコードが行います。答えの中の数字は計算結果と照合し、照合できない数字を unmatchedNumbers に入れます。全体で1日10回・IP ごとに3回まで。",
  apiSatsDesc: "予測できる衛星の一覧（CelesTrak の stations と visual）。",
  apiCopy: "コピー",
  apiCopied: "コピーしました",
  apiResult: "実行結果",
  apiTrimmed: (n: number) => `この画面で調べたときの実際の応答。通過は全${n}件のうち1件だけ表示し、画面用の path は省いています。`,
  apiSatsTrimmed: (n: number) => `実際の応答。衛星は全${n}機のうち3機だけ表示しています。`,
  apiNoResult: "「通過を調べる」で調べると、ここに実際の応答が出ます。",
  apiAskNoResult: "「AI に聞く」で質問すると、ここに実際の応答が出ます（AI への質問は回数に限りがあるため、このタブからは実行しません）。",
  aboutButton: "この画面について",
  footSources: "出典：軌道要素 CelesTrak ／ 雲量・地名 Weather data by Open-Meteo.com（CC BY 4.0、非商用）",
  footMore: "出典と詳しい説明",
  switchTo: "English",
  tryTitle: "試してみる",
  place: "場所",
  placePlaceholder: "例：札幌市、東京都、Tokyo",
  here: "現在地",
  satellite: "衛星",
  days: "日数",
  search: "調べる",
  searching: "計算中…",
  resultTitle: (place: string, sat: string) => `${place} から見える ${sat}`,
  noPass: "この期間に見える通過はありません。日数を延ばすか、別の衛星を試してください。",
  colRank: "順位",
  colStart: "見え始め",
  colMax: "いちばん高い",
  colEnd: "見え終わり",
  colDuration: "時間",
  colCloud: "雲量",
  minutes: (m: string) => `${m}分`,
  rank: (r: number) => `${r}位`,
  points: (s: number) => `${s}点`,
  noForecast: "予報なし",
  timeNote: (tz: string) => `順位は見やすさの点数（100点満点。高さ・見える時間・雲量から計算）の順。時刻は ${tz}。行を押すと、空のドームにその通過を描きます。`,
  endsBy: { horizon: "地平線へ", shadow: "地球の影へ", daylight: "空が明るくなる" } as Record<string, string>,
  jsonLink: "JSON",
  skyTitle: (rank: number, date: string) => `${date} の通過（${rank}位）`,
  skySub: "光る線が見える部分、点線は地球の影の中や低すぎて見えない部分。30倍速。ドラッグで回せます。",
  skyEmpty: "見える通過がありません",
  viewOutside: "外から見る",
  viewInside: "見上げる",
  play: "再生",
  pause: "一時停止",
  compass: ["北", "北東", "東", "南東", "南", "南西", "西", "北西"],
  ring: (d: number): string => (d === 10 ? "10°（ここから上で見える）" : `${d}°`),
  markStart: (time: string) => `見え始め ${time}`,
  markMax: (time: string, el: number) => `${el}° ${time}`,
  markEnd: (time: string, endsBy: string) => `${endsBy} ${time}`,
  endsByShort: { horizon: "沈む", shadow: "影へ", daylight: "明るく" } as Record<string, string>,
  nowPos: (dir: string, el: number) => `${dir}・高さ ${el}°`,
  visibleNow: "見えている",
  hiddenNow: (el: number): string => (el < 10 ? "低すぎて見えない" : "見えない（影の中など）"),
  dir: (d: string) => DIR_JA[d] ?? d,
  elev: (e: number) => `高さ ${e}°`,
  askTitle: "質問する（AI）",
  askPlaceholder: "例：札幌で今週いちばん見やすいのは？",
  askButton: "聞く",
  asking: "考え中…（10秒ほど）",
  askLimit: "AI への質問は全体で1日10回まで。地名がない質問は、「通過を調べる」で選んだ場所について答えます。",
  understood: (place: string, days: number, sat: string) => `読み取った条件：${place}・${days}日間・${sat}`,
  allMatched: "✓ 答えの中の数字は、すべて計算結果と一致しました",
  unmatched: (list: string) => `⚠ 計算結果と照合できなかった数字：${list}`,
  aiNote: (cached: boolean) => `Claude による答え${cached ? "（保存した答え）" : ""}。順位と数字はコードの計算で、方角の言い換えなどに誤りを含むことがあります。`,
  apiError: (status: number, message?: string) => message ?? `エラー（HTTP ${status}）`,
  geoFailed: "現在地を取得できませんでした",
  hereLabel: "現在地",
  conditionsTitle: "「見える」の条件",
  conditions: "高さ10度以上・観測地の太陽が地平線の6度以上下（空が暗い）・衛星に日が当たっている（地球の影に入っていない）。NASA の Spot the Station と同じ考え方です。",
  scoreTitle: "見やすさの点数（100点満点）",
  score: "（いちばん高いときの高さ 80点〈真上で満点〉＋ 見える時間 20点〈6分以上で満点〉）×（1 − 0.9 × 雲量）。雲が多いと大きく下がります。雲の予報がない日は雲量50%とみなします。",
  accuracyTitle: "精度",
  accuracy: "NASA の公式の予測（Spot the Station）と日本10都市・世界7都市で比べ、NASA の通過189回のうち188回が見つかり、見え始めは95%が同じ分でした。詳しくは GitHub の eval/RESULTS.md。",
  domeTitle: "空のドーム",
  domeAbout: "観測地を中心にした半球の空に、衛星の通り道を描いています。光る線が見える部分で、点線は地球の影の中や高さ10°未満で見えない部分です。動きは実際の30倍の速さ。背景の星は飾りで、実際の星の位置ではありません。",
};

type Dict = typeof ja;

const en: Dict = {
  title: "Satellite Pass API",
  description: "Give a place and get the times, directions and elevations when the ISS and other satellites are visible, with the cloud forecast.",
  lead: "Give a place and get when the ISS and other satellites are visible, with the cloud forecast. Code does all the math; AI only reads your question and writes the answer.",
  tabSearch: "Find passes",
  tabAsk: "Ask AI",
  tabApi: "API",
  apiIntro: "This page is built on the three APIs below. No key needed, and you can call them from other sites or scripts (CORS enabled). The commands follow your current inputs, and the results are the actual responses this page received.",
  apiPassesDesc: "Visible passes with times (UTC and local), directions, elevations, cloud cover, score and rank.",
  apiParams: [
    ["place", "Place name (e.g. Tokyo, 札幌市), looked up with Open-Meteo"],
    ["lat, lon", "Latitude and longitude (degrees), instead of place"],
    ["sat", "NORAD ID or name (ISS, Tiangong, Hubble …). Default: ISS"],
    ["days", "1–7 (default 7)"],
    ["lang", "ja or en (place-name language)"],
    ["path", "Set to 1 to add each pass's path across the sky ([seconds, azimuth, elevation, visible] every 5 s). The dome on this page is drawn from it"],
  ],
  apiAskDesc: "Answers a question in natural language. AI only reads the place, days and satellite from the question and writes the answer; code does the calculation and ranking. Numbers in the answer are checked against the calculation, and any that don't match go into unmatchedNumbers. Limited to 10 per day in total and 3 per IP.",
  apiSatsDesc: "Satellites you can predict (CelesTrak stations and visual groups).",
  apiCopy: "Copy",
  apiCopied: "Copied",
  apiResult: "Result",
  apiTrimmed: (n) => `The actual response this page received. Only 1 of ${n} passes is shown, and the path used by the page is left out.`,
  apiSatsTrimmed: (n) => `The actual response. Only 3 of ${n} satellites are shown.`,
  apiNoResult: "Search in “Find passes” and the actual response appears here.",
  apiAskNoResult: "Ask in “Ask AI” and the actual response appears here (AI questions are limited, so this tab does not run them).",
  aboutButton: "About",
  footSources: "Sources: orbital elements CelesTrak / clouds and places: Weather data by Open-Meteo.com (CC BY 4.0, non-commercial)",
  footMore: "Sources and details",
  switchTo: "日本語",
  tryTitle: "Try it",
  place: "Place",
  placePlaceholder: "e.g. Tokyo, Sapporo, London",
  here: "My location",
  satellite: "Satellite",
  days: "Days",
  search: "Search",
  searching: "Calculating…",
  resultTitle: (place, sat) => `${sat} seen from ${place}`,
  noPass: "No visible passes in this period. Try more days or another satellite.",
  colRank: "Rank",
  colStart: "Appears",
  colMax: "Highest",
  colEnd: "Disappears",
  colDuration: "Time",
  colCloud: "Clouds",
  minutes: (m) => `${m} min`,
  rank: (r) => `#${r}`,
  points: (s) => `${s} pts`,
  noForecast: "no forecast",
  timeNote: (tz) => `Ranked by score (out of 100, from elevation, visible time and clouds). Times in ${tz}. Click a row to show that pass in the sky.`,
  endsBy: { horizon: "to horizon", shadow: "into Earth's shadow", daylight: "sky gets bright" },
  jsonLink: "JSON",
  skyTitle: (rank, date) => `Pass on ${date} (#${rank})`,
  skySub: "The glowing line is the visible part; dotted parts are in Earth's shadow or too low. 30× speed. Drag to rotate.",
  skyEmpty: "No visible passes",
  viewOutside: "Outside view",
  viewInside: "Look up",
  play: "Play",
  pause: "Pause",
  compass: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
  ring: (d) => (d === 10 ? "10° (visible above)" : `${d}°`),
  markStart: (time) => `appears ${time}`,
  markMax: (time, el) => `${el}° ${time}`,
  markEnd: (time, endsBy) => `${endsBy} ${time}`,
  endsByShort: { horizon: "sets", shadow: "shadow", daylight: "bright" },
  nowPos: (dir, el) => `${dir} · ${el}° up`,
  visibleNow: "visible",
  hiddenNow: (el) => (el < 10 ? "too low" : "hidden (shadow etc.)"),
  dir: (d) => d,
  elev: (e) => `${e}° up`,
  askTitle: "Ask (AI)",
  askPlaceholder: "e.g. When is the best ISS pass in London this week?",
  askButton: "Ask",
  asking: "Thinking… (about 10 seconds)",
  askLimit: "AI questions are limited to 10 per day in total. Questions without a place use the place from “Find passes”.",
  understood: (place, days, sat) => `Understood: ${place}, ${days} days, ${sat}`,
  allMatched: "✓ Every number in the answer matches the calculation",
  unmatched: (list) => `⚠ Numbers that could not be matched to the calculation: ${list}`,
  aiNote: (cached) => `Answer by Claude${cached ? " (saved)" : ""}. Ranks and numbers come from code; wording such as directions may contain mistakes.`,
  apiError: (status, message) =>
    status === 429 ? "The daily limit for AI questions has been reached (10 per day in total, 3 per person). Please try again tomorrow." : (message && /^[\x00-\x7F]*$/.test(message) ? message : `Something went wrong (HTTP ${status}).`),
  geoFailed: "Could not get your location",
  hereLabel: "My location",
  conditionsTitle: "What counts as visible",
  conditions: "At least 10° above the horizon, the Sun at least 6° below the horizon at your place (dark sky), and the satellite in sunlight (not in Earth's shadow) — the same idea as NASA's Spot the Station.",
  scoreTitle: "Score (out of 100)",
  score: "(Highest elevation 80 points [overhead = full] + visible time 20 points [6 min or more = full]) × (1 − 0.9 × cloud cover). Clouds pull the score down a lot; days without a cloud forecast count as 50% cloud.",
  accuracyTitle: "Accuracy",
  accuracy: "Compared with NASA's Spot the Station for 10 cities in Japan and 7 elsewhere: 188 of NASA's 189 passes were found, and 95% start in the same minute. Details in eval/RESULTS.md on GitHub.",
  domeTitle: "The sky dome",
  domeAbout: "A half-sphere of sky centered on your place, with the satellite's path drawn on it. The glowing line is the visible part; dotted parts are in Earth's shadow or below 10°. The motion is 30× real time. The background stars are decoration, not real star positions.",
};

export const t: Dict = lang === "en" ? en : ja;

/** index.html の data-i18n などを差し替える */
export function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", t.description);
  const get = (k: string | undefined) => (k && typeof t[k as keyof Dict] === "string" ? (t[k as keyof Dict] as string) : null);
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const v = get(el.dataset.i18n);
    if (v !== null) el.textContent = v;
  });
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder]").forEach((el) => {
    const v = get(el.dataset.i18nPlaceholder);
    if (v !== null) el.placeholder = v;
  });
}
