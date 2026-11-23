// 作品の情報（scripts/build-themes.ts が作る lib/paintings-data.json）の型と、天気・時間帯から絵を選ぶ規則。
// 拡張機能の中（src/extension.ts）でも使うので、Node の機能には依存しない。
import type { PaletteColor } from "./palette.js";
import type { Adjustment, Roles } from "./theme.js";

export const MOODS = ["clear", "cloudy", "rain", "snow", "storm", "night", "dusk", "dawn"] as const;
export type Mood = (typeof MOODS)[number];

export const MOOD_JA: Record<Mood, string> = {
  clear: "晴れ",
  cloudy: "くもり",
  rain: "雨",
  snow: "雪",
  storm: "嵐・強い風",
  night: "夜",
  dusk: "夕方",
  dawn: "朝",
};

export interface PaintingInfo {
  id: string;
  slug: string;
  label: string;
  titleJa: string;
  artistJa: string;
  title: string;
  artist: string | null;
  date: string | null;
  moods: Mood[];
  explanation: string;
  colorStory: string;
  imageUrl: string;
  pageUrl: string;
  credit: string;
  license: string;
  palette: PaletteColor[];
  roles: Roles;
  naiveRoles: Roles;
  adjustments: Adjustment[];
  checks: { offPaletteRoles: string[]; unmatchedNumbers: string[] };
}

export interface WeatherNow {
  /** WMO の天気コード（Open-Meteo の weather_code） */
  code: number;
  windKmh: number;
  isDay: boolean;
  /** 日の出・日の入りからの時間（分）。分からなければ null */
  minutesFromSunrise: number | null;
  minutesToSunset: number | null;
}

/**
 * いまの天気と時間帯を、絵の雰囲気（Mood）に直す。優先順：嵐 → 雪 → 雨 → 朝・夕方 → 夜 → くもり → 晴れ
 * WMO の天気コード：0 快晴、1〜3 晴れ〜くもり、45・48 霧、51〜67 霧雨・雨、71〜77 雪、80〜82 にわか雨、85・86 にわか雪、95〜99 雷雨
 */
export function moodOf(w: WeatherNow): Mood {
  if (w.code >= 95 || w.windKmh >= 40) return "storm";
  if ((w.code >= 71 && w.code <= 77) || w.code === 85 || w.code === 86) return "snow";
  if ((w.code >= 51 && w.code <= 67) || (w.code >= 80 && w.code <= 82)) return "rain";
  if (w.minutesFromSunrise !== null && w.minutesFromSunrise >= -30 && w.minutesFromSunrise <= 90) return "dawn";
  if (w.minutesToSunset !== null && w.minutesToSunset >= -30 && w.minutesToSunset <= 90) return "dusk";
  if (!w.isDay) return "night";
  if (w.code >= 2) return "cloudy";
  return "clear";
}

/** 近い雰囲気（ちょうど合う絵がないときに使う） */
const FALLBACK: Record<Mood, Mood[]> = {
  storm: ["rain", "cloudy", "night"],
  snow: ["cloudy", "dawn", "night"],
  rain: ["cloudy", "storm", "night"],
  dawn: ["clear", "dusk", "cloudy"],
  dusk: ["dawn", "night", "clear"],
  night: ["dusk", "cloudy"],
  cloudy: ["rain", "clear"],
  clear: ["dawn", "cloudy"],
};

/** 雰囲気に合う絵を選ぶ。合う絵が複数あれば日ごとに順番に（毎日同じ絵にならないように） */
export function pickPainting(paintings: PaintingInfo[], mood: Mood, day: number): { painting: PaintingInfo; matched: Mood } {
  for (const m of [mood, ...FALLBACK[mood]]) {
    const hits = paintings.filter((p) => p.moods.includes(m));
    if (hits.length) return { painting: hits[day % hits.length], matched: m };
  }
  return { painting: paintings[day % paintings.length], matched: mood };
}
