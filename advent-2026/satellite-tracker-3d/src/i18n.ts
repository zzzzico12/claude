// 画面の言語（日本語・英語）。切り替えはページを読み込み直す（選んだ衛星は URL の # で引き継ぐ）
// 決め方：URL の ?lang= → 前に選んだ言語（localStorage）→ ブラウザの言語（日本語以外なら英語）
export type Lang = "ja" | "en";

const STORAGE_KEY = "satellite-tracker-3d:lang";

function detect(): Lang {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "ja" || q === "en") return q;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ja" || saved === "en") return saved;
  } catch {
    // 保存できない環境（プライベートモードなど）ではブラウザの言語で決める
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

const ja = {
  // index.html の固定の文
  title: "人工衛星は今どこ？",
  description: "今動いている約1万7千機の人工衛星を、3Dの地球儀にリアルタイムで表示します。",
  loading: "軌道のデータを読み込み中…",
  globeLabel: "人工衛星の位置を示す3Dの地球儀",
  speedLabel: "時間の進み方",
  realtime: "実時間",
  x60: "60倍",
  x600: "600倍",
  now: "今",
  nowTitle: "今の時刻・実時間に戻す",
  search: "衛星を探す",
  searchPlaceholder: "例：ISS、HIMAWARI、QZS",
  categories: "種類",
  allOn: "すべて表示",
  starlinkOff: "Starlink 以外",
  orbit: "軌道",
  owner: "国・組織",
  explainButton: "AI に「何の衛星か」を解説してもらう",
  explainLimit: "AI の解説は全体で1日10回まで（同じ衛星の2回目からは保存した解説を出します）。",
  methodTitle: "しくみ",
  method1:
    "衛星の軌道要素（GP データ）は CelesTrak から、サーバーで2時間に1回だけまとめて取得し、全員で使い回します（CelesTrak は頻繁な取得を控えるよう求めています）。",
  method2:
    "位置はブラウザの中（Web Worker）で、SGP4 という軌道の計算方法で 0.25 秒ごとに全機分を計算し、そのあいだは補間して動かしています。",
  method3:
    "種類は CelesTrak の分類・UCS Satellite Database の目的・衛星の名前の順に決めています。UCS は 2023年5月で更新が止まっていて、それ以降の衛星（Starlink の半分以上など）は載っていません。",
  method4:
    "AI の解説には、カタログの項目と、コードが軌道要素から計算した高さ・周期・傾きだけを渡しています。解説の中の数字は自動で照合し、合わないものには ⚠ を付けます。",
  method5: "位置の精度：ISS では、NASA の公式の軌道データと比べたずれが数 km でした（評価の詳細は GitHub の eval/RESULTS.md）。",
  switchTo: "English",

  // main.ts で組み立てる文
  numLocale: "ja-JP",
  all: (n: number) => `すべて（${n}）`,
  ownerOption: (name: string, n: string) => `${name}（${n}）`,
  clock: (t: string, speed: number) => `${t}（日本時間）${speed === 1 ? "" : ` ・ ${speed}倍速`}`,
  status: (n: string, t: string, stale: boolean) =>
    `稼働中の人工衛星 ${n} 機 ・ 軌道要素の取得：${t}${stale ? "（取得の待ち中のため、少し古いデータ）" : ""}`,
  perf: (fps: string, avg: string, ms: string) => `描画 ${fps} コマ/秒（10秒平均 ${avg}）・位置の計算 ${ms} ms/回`,
  rows: {
    category: "種類",
    owner: "国・組織",
    launch: "打ち上げ日",
    orbit: "軌道",
    period: "1周",
    inclination: "軌道の傾き",
    position: "今の位置",
    elements: "軌道要素",
    norad: "NORAD 番号",
    ucsPurpose: "目的（UCS）",
    ucsOperator: "運用者（UCS）",
    ucsUsers: "利用者（UCS）",
    ucs: "UCS",
  },
  orbitValue: (regime: string, lo: string, hi: string) => `${regime}・高さ ${lo}〜${hi} km`,
  periodValue: (min: number, revs: number) => `${min} 分（1日 ${revs} 周）`,
  degrees: (d: number) => `${d} 度`,
  elementsValue: (epoch: string, age: number) => `${epoch}（${age} 日前）`,
  operatorValue: (op: string, country: string) => `${op}（${country}）`,
  notInUcs: "載っていない（2023年5月で更新停止）",
  afterCatalog: "（カタログ作成後に打ち上げられた衛星）",
  unknown: "不明",
  positionFailed: "計算できません（軌道要素が古いか、落下した可能性）",
  position: (lat: number, lon: number, alt: string) =>
    `${lat >= 0 ? "北緯" : "南緯"} ${Math.abs(lat).toFixed(1)}°・${lon >= 0 ? "東経" : "西経"} ${Math.abs(lon).toFixed(1)}°・高さ ${alt} km`,
  explaining: "解説を作成中…（10秒ほどかかります）",
  unmatched: (list: string) => `⚠ 事実と照合できなかった数字：${list}`,
  listSep: "、",
  allMatched: "✓ 解説の中の数字は、すべてカタログか軌道の計算と一致しました",
  aiNote: (cached: boolean) => `Claude による解説${cached ? "（保存した解説）" : ""}。根拠はカタログと軌道の数字だけで、誤りを含むことがあります。`,
  apiError: (status: number, message?: string) => message ?? `エラー（HTTP ${status}）`,
  loadFailed: (m: string) => `読み込みに失敗しました：${m}`,
};

type Dict = typeof ja;

const en: Dict = {
  title: "Where are the satellites now?",
  description: "About 17,000 active satellites on a 3D globe, in real time.",
  loading: "Loading orbital data…",
  globeLabel: "3D globe showing satellite positions",
  speedLabel: "Time speed",
  realtime: "Real time",
  x60: "60×",
  x600: "600×",
  now: "Now",
  nowTitle: "Back to the current time at real-time speed",
  search: "Find a satellite",
  searchPlaceholder: "e.g. ISS, HIMAWARI, QZS",
  categories: "Category",
  allOn: "Show all",
  starlinkOff: "All but Starlink",
  orbit: "Orbit",
  owner: "Country / organization",
  explainButton: "Ask AI what this satellite is",
  explainLimit: "AI explanations are limited to 10 per day in total (a satellite explained before shows the saved text).",
  methodTitle: "How it works",
  method1:
    "Orbital elements (GP data) come from CelesTrak. The server fetches them at most once every 2 hours and shares them with everyone, as CelesTrak asks users not to fetch frequently.",
  method2:
    "Positions are computed in your browser (in a Web Worker) with the SGP4 orbit model for every satellite every 0.25 s, and interpolated in between.",
  method3:
    "Categories come from CelesTrak's groups, then the UCS Satellite Database's purpose, then the satellite's name. UCS stopped updating in May 2023, so later satellites (including more than half of Starlink) are not listed.",
  method4:
    "The AI explanation receives only catalog fields and the altitude, period and inclination computed by code from the orbital elements. Numbers in the explanation are checked automatically and marked ⚠ if they don't match.",
  method5: "Accuracy: for the ISS, the position was within a few km of NASA's official trajectory data (details in eval/RESULTS.md on GitHub).",
  switchTo: "日本語",

  numLocale: "en-US",
  all: (n) => `All (${n})`,
  ownerOption: (name, n) => `${name} (${n})`,
  clock: (t, speed) => `${t} UTC${speed === 1 ? "" : ` · ${speed}×`}`,
  status: (n, t, stale) => `${n} active satellites · orbital elements fetched ${t} UTC${stale ? " (slightly old data while the next fetch is pending)" : ""}`,
  perf: (fps, avg, ms) => `Rendering ${fps} fps (10 s avg ${avg}) · position calc ${ms} ms`,
  rows: {
    category: "Category",
    owner: "Owner",
    launch: "Launch date",
    orbit: "Orbit",
    period: "Period",
    inclination: "Inclination",
    position: "Position now",
    elements: "Orbital elements",
    norad: "NORAD ID",
    ucsPurpose: "Purpose (UCS)",
    ucsOperator: "Operator (UCS)",
    ucsUsers: "Users (UCS)",
    ucs: "UCS",
  },
  orbitValue: (regime, lo, hi) => `${regime}, altitude ${lo}–${hi} km`,
  periodValue: (min, revs) => `${min} min (${revs} orbits a day)`,
  degrees: (d) => `${d}°`,
  elementsValue: (epoch, age) => `${epoch} (${age} days ago)`,
  operatorValue: (op, country) => `${op} (${country})`,
  notInUcs: "Not listed (updates stopped in May 2023)",
  afterCatalog: "(launched after the catalog was built)",
  unknown: "Unknown",
  positionFailed: "Cannot compute (the elements may be old, or it may have re-entered)",
  position: (lat, lon, alt) => `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? "E" : "W"}, altitude ${alt} km`,
  explaining: "Writing the explanation… (about 10 seconds)",
  unmatched: (list) => `⚠ Numbers that could not be matched to the facts: ${list}`,
  listSep: ", ",
  allMatched: "✓ Every number in the explanation matches the catalog or the orbit calculation",
  aiNote: (cached) => `Explanation by Claude${cached ? " (saved)" : ""}. It is based only on the catalog and orbit numbers and may contain mistakes.`,
  apiError: (status) =>
    status === 429 ? "The daily limit for AI explanations has been reached (10 per day in total, 3 per person). Please try again tomorrow." : `Something went wrong (HTTP ${status}). Please try again later.`,
  loadFailed: (m) => `Failed to load: ${m}`,
};

export const t: Dict = lang === "en" ? en : ja;

/** index.html の data-i18n（文）・data-i18n-placeholder・data-i18n-title・data-i18n-aria を差し替える */
export function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", t.description);
  const get = (k: string | undefined) => (k && typeof t[k as keyof Dict] === "string" ? (t[k as keyof Dict] as string) : null);
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const v = get(el.dataset.i18n);
    if (v !== null) el.textContent = v;
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((el) => {
    const v = get(el.dataset.i18nPlaceholder);
    if (v !== null) el.placeholder = v;
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const v = get(el.dataset.i18nTitle);
    if (v !== null) el.title = v;
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => {
    const v = get(el.dataset.i18nAria);
    if (v !== null) el.setAttribute("aria-label", v);
  });
}
