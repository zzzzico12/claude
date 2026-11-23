// 衛星の種類（絞り込みと色分けに使う）。順番は色の順番でもあるので、変えるときは style.css も直す
// 決め方（上から順に、最初に当てはまったもの）：
//   1. CelesTrak の分類（GROUP）に入っているか（scripts/build-catalog.ts で事前に取得）
//   2. UCS Satellite Database の Purpose
//   3. 衛星の名前
// カタログを作ったあとに打ち上げられた衛星は、画面で 3 だけを使って決める

export const CATEGORIES = [
  { id: "starlink", label: "Starlink" },
  { id: "constellation", label: "他の通信衛星群（OneWeb・Kuiper・千帆など）" },
  { id: "comms", label: "通信・放送（その他）" },
  { id: "navigation", label: "測位（GPS・みちびきなど）" },
  { id: "weather", label: "気象" },
  { id: "earth", label: "地球観測" },
  { id: "station", label: "宇宙ステーション・有人" },
  { id: "other", label: "科学・技術試験・その他" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_INDEX = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i])) as Record<CategoryId, number>;

/** CelesTrak の GROUP → 種類。上にあるものほど優先（例：geo には気象衛星も入るので、weather を先に見る） */
export const GROUP_CATEGORY: [string, CategoryId][] = [
  ["stations", "station"],
  ["gnss", "navigation"],
  ["sbas", "navigation"],
  ["weather", "weather"],
  ["oneweb", "constellation"],
  ["kuiper", "constellation"],
  ["qianfan", "constellation"],
  ["hulianwang", "constellation"],
  ["iridium-NEXT", "constellation"],
  ["globalstar", "constellation"],
  ["orbcomm", "constellation"],
  ["resource", "earth"],
  ["sar", "earth"],
  ["planet", "earth"],
  ["spire", "earth"],
  ["dmc", "earth"],
  ["argos", "earth"],
  ["intelsat", "comms"],
  ["ses", "comms"],
  ["eutelsat", "comms"],
  ["telesat", "comms"],
  ["tdrss", "comms"],
  ["other-comm", "comms"],
  ["x-comm", "comms"],
  ["geo", "comms"],
  ["science", "other"],
  ["geodetic", "other"],
  ["engineering", "other"],
  ["education", "other"],
  ["military", "other"],
  ["radar", "other"],
  ["cubesat", "other"],
  ["amateur", "other"],
];

export function categoryFromUcs(purpose: string): CategoryId | null {
  const p = purpose.toLowerCase();
  if (p.includes("navigation")) return "navigation";
  if (p.includes("meteorolog")) return "weather";
  if (p.includes("earth observation") || p.includes("earth science")) return "earth";
  if (p.includes("communications")) return "comms";
  if (p) return "other";
  return null;
}

const NAME_RULES: [RegExp, CategoryId][] = [
  [/^(ISS|CSS|TIANHE|WENTIAN|MENGTIAN|SHENZHOU|TIANZHOU|SOYUZ|PROGRESS|CREW DRAGON|DRAGON|CYGNUS|HTV)\b/, "station"],
  [/^STARLINK/, "starlink"],
  [/^(ONEWEB|KUIPER|QIANFAN|HULIANWANG|GUOWANG|IRIDIUM|GLOBALSTAR|ORBCOMM|O3B|BLUEBIRD|SPACEMOBILE|LYNK|RASSVET|GEESAT|TIANQI|CONNECTA|GONETS)/, "constellation"],
  [/^(NAVSTAR|GPS|GLONASS|GALILEO|GSAT0|BEIDOU|QZS|IRNSS|NVS|CENTISPACE)/, "navigation"],
  [/^(NOAA|GOES|METEOSAT|MTG|METOP|HIMAWARI|FENGYUN|FY-|ELEKTRO|METEOR|GEO-KOMPSAT-2A|JPSS|SUOMI|DMSP|EWS|YUNHAI|YUNYAO)/, "weather"],
  [/^(FLOCK|SKYSAT|ICEYE|LEMUR|SENTINEL|LANDSAT|WORLDVIEW|CAPELLA|SUPERDOVE|YAOGAN|GAOFEN|JILIN|PLEIADES|UMBRA|SATELLOGIC|NUSAT|ALOS|GCOM|HAWK|IRIDE|PIESAT|SUPERVIEW|GRUS|GHGSAT|NEONSAT|WILDFIRE|FOREST|TIANHUI)/, "earth"],
  [/^(INTELSAT|SES|EUTELSAT|ASTRA|TELSTAR|ECHOSTAR|VIASAT|INMARSAT|SKY MUSTER|JCSAT|BSAT|SUPERBIRD|TDRS|CHINASAT|APSTAR|TIANLIAN)/, "comms"],
];

export function categoryFromName(name: string): CategoryId {
  for (const [re, c] of NAME_RULES) if (re.test(name)) return c;
  return "other";
}
