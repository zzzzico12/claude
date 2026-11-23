// 役割ごとの色（背景・文字・キーワード…）から、VS Code のテーマ（JSON）を作る。
// 文字と背景の組はすべて、WCAG AA（4.5:1）を満たすまで文字色の明るさを調整する。
import { AA, colorDifference, ensureContrast, lightness, withLightness } from "./color.js";

export const TOKEN_ROLES = ["keyword", "string", "number", "function", "type", "comment"] as const;
export type TokenRole = (typeof TOKEN_ROLES)[number];

export interface Roles {
  type: "dark" | "light";
  background: string;
  foreground: string;
  accent: string;
  keyword: string;
  string: string;
  number: string;
  function: string;
  type_: string;
  comment: string;
}

export interface Adjustment {
  role: string;
  original: string;
  adjusted: string;
  /** 調整でどれだけ色が変わったか（ΔE2000。0 なら変えていない） */
  deltaE: number;
}

/** コードの色どうしは、これ以上違って見えるようにする（ΔE2000）。単色に近い絵だと全部が似た色になるため */
export const MIN_TOKEN_DE = 8;

/**
 * 似すぎた色を、背景から遠ざける方向に明るさを動かして離す（色相は保つ。背景から遠ざけるのでコントラストは下がらない）
 * - 先に並べた色ほど元のまま残す（コメント → 文字 → キーワード… の順に渡す）
 * - 動かせる幅は maxShift まで。それでも離せなければ元に戻す（真っ白・真っ黒にはしない）
 */
export function separate(colors: string[], dark: boolean, minDE = MIN_TOKEN_DE, maxShift = 0.4): string[] {
  const out: string[] = [];
  for (const c of colors) {
    const L0 = lightness(c);
    let cur = c;
    let ok = !out.some((o) => colorDifference(o, cur) < minDE);
    for (let d = 0.02; !ok && d <= maxShift + 1e-9; d += 0.02) {
      const L = L0 + (dark ? d : -d);
      if (L > 0.97 || L < 0.03) break;
      const next = withLightness(c, L);
      if (!out.some((o) => colorDifference(o, next) < minDE)) {
        cur = next;
        ok = true;
      }
    }
    out.push(cur);
  }
  return out;
}

/** 背景は、ダークなら十分に暗く、ライトなら十分に明るくする（色相は保つ） */
export function normalizeBackground(bg: string, type: Roles["type"]): string {
  const L = lightness(bg);
  if (type === "dark" && L > 0.26) return withLightness(bg, 0.24);
  if (type === "light" && L < 0.93) return withLightness(bg, 0.95);
  return bg;
}

const shift = (hex: string, dL: number) => withLightness(hex, Math.min(1, Math.max(0, lightness(hex) + dL)));

export interface BuiltTheme {
  json: Record<string, unknown>;
  /** 検査する「文字と背景」の組（評価にも使う） */
  pairs: { name: string; fg: string; bg: string }[];
  adjustments: Adjustment[];
}

export function buildTheme(name: string, roles: Roles): BuiltTheme {
  const adjustments: Adjustment[] = [];
  const record = (role: string, original: string, adjusted: string) => {
    adjustments.push({ role, original, adjusted, deltaE: Math.round(colorDifference(original, adjusted) * 10) / 10 });
    return adjusted;
  };
  const dark = roles.type === "dark";
  const bg = record("background", roles.background, normalizeBackground(roles.background, roles.type));

  // まず読みやすさ（コントラスト）を満たし、次に色どうしを見分けられるように離す
  const order = [
    ["comment", roles.comment],
    ["foreground", roles.foreground],
    ["keyword", roles.keyword],
    ["string", roles.string],
    ["function", roles.function],
    ["type", roles.type_],
    ["number", roles.number],
  ] as const;
  const contrasted = order.map(([, c]) => ensureContrast(c, bg, AA));
  const separated = separate(contrasted, dark);
  const finalOf = Object.fromEntries(order.map(([role, original], i) => [role, record(role, original, separated[i])]));
  const fg = finalOf.foreground;
  const tokens = {
    keyword: finalOf.keyword,
    string: finalOf.string,
    number: finalOf.number,
    function: finalOf.function,
    type: finalOf.type,
    comment: finalOf.comment,
  };
  // まわりの面（サイドバーなど）は背景を少しだけずらした色
  const surface = shift(bg, dark ? -0.03 : -0.035);
  const raised = shift(bg, dark ? 0.04 : -0.06);
  const accent = roles.accent;
  const onAccent = ensureContrast(dark ? bg : "#ffffff", accent, AA);
  const fgOnSurface = ensureContrast(fg, surface, AA);
  const mutedOnSurface = ensureContrast(tokens.comment, surface, AA);
  const accentOnBg = ensureContrast(accent, bg, 3); // カーソルや枠線は文字ではないので 3:1（WCAG の非テキストの基準）

  const colors: Record<string, string> = {
    "editor.background": bg,
    "editor.foreground": fg,
    "editorLineNumber.foreground": tokens.comment,
    "editorLineNumber.activeForeground": fg,
    "editorCursor.foreground": accentOnBg,
    "editor.selectionBackground": `${accent}55`,
    "editor.lineHighlightBackground": raised,
    "editorWhitespace.foreground": `${tokens.comment}66`,
    "editorIndentGuide.background1": `${tokens.comment}33`,
    "editorWidget.background": surface,
    "editorWidget.foreground": fgOnSurface,
    "sideBar.background": surface,
    "sideBar.foreground": fgOnSurface,
    "sideBarTitle.foreground": fgOnSurface,
    "sideBarSectionHeader.background": surface,
    "sideBarSectionHeader.foreground": fgOnSurface,
    "activityBar.background": surface,
    "activityBar.foreground": fgOnSurface,
    "activityBar.inactiveForeground": mutedOnSurface,
    "activityBarBadge.background": accent,
    "activityBarBadge.foreground": onAccent,
    "titleBar.activeBackground": surface,
    "titleBar.activeForeground": fgOnSurface,
    "titleBar.inactiveBackground": surface,
    "titleBar.inactiveForeground": mutedOnSurface,
    "statusBar.background": accent,
    "statusBar.foreground": onAccent,
    "statusBar.noFolderBackground": accent,
    "tab.activeBackground": bg,
    "tab.activeForeground": fg,
    "tab.inactiveBackground": surface,
    "tab.inactiveForeground": mutedOnSurface,
    "tab.activeBorderTop": accentOnBg,
    "editorGroupHeader.tabsBackground": surface,
    "panel.background": surface,
    "panel.border": raised,
    "terminal.background": bg,
    "terminal.foreground": fg,
    "input.background": raised,
    "input.foreground": ensureContrast(fg, raised, AA),
    "dropdown.background": raised,
    "dropdown.foreground": ensureContrast(fg, raised, AA),
    "button.background": accent,
    "button.foreground": onAccent,
    "focusBorder": accentOnBg,
    "list.activeSelectionBackground": raised,
    "list.activeSelectionForeground": ensureContrast(fg, raised, AA),
    "list.hoverBackground": raised,
    "badge.background": accent,
    "badge.foreground": onAccent,
  };

  const pairs = [
    { name: "editor.foreground", fg, bg },
    ...Object.entries(tokens).map(([k, v]) => ({ name: `token.${k}`, fg: v, bg })),
    { name: "editorLineNumber.foreground", fg: tokens.comment, bg },
    { name: "sideBar.foreground", fg: fgOnSurface, bg: surface },
    { name: "activityBar.inactiveForeground", fg: mutedOnSurface, bg: surface },
    { name: "tab.inactiveForeground", fg: mutedOnSurface, bg: surface },
    { name: "statusBar.foreground", fg: onAccent, bg: accent },
    { name: "button.foreground", fg: onAccent, bg: accent },
    { name: "input.foreground", fg: colors["input.foreground"], bg: raised },
    { name: "list.activeSelectionForeground", fg: colors["list.activeSelectionForeground"], bg: raised },
    { name: "terminal.foreground", fg, bg },
  ];

  const scope = (scopes: string[], foreground: string, fontStyle?: string) => ({
    scope: scopes,
    settings: { foreground, ...(fontStyle ? { fontStyle } : {}) },
  });
  const tokenColors = [
    scope(["comment", "punctuation.definition.comment"], tokens.comment, "italic"),
    scope(["keyword", "storage", "storage.type", "keyword.operator.new", "keyword.control"], tokens.keyword),
    scope(["string", "string.quoted", "string.template", "punctuation.definition.string"], tokens.string),
    scope(["constant.numeric", "constant.language", "constant.character", "support.constant"], tokens.number),
    scope(["entity.name.function", "support.function", "meta.function-call"], tokens.function),
    scope(["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"], tokens.type),
    scope(["variable", "meta.definition.variable", "punctuation", "meta.brace"], fg),
    scope(["entity.name.tag"], tokens.keyword),
    scope(["entity.other.attribute-name"], tokens.function),
    scope(["markup.heading"], tokens.keyword, "bold"),
  ];

  return {
    json: {
      $schema: "vscode://schemas/color-theme",
      name,
      type: roles.type,
      semanticHighlighting: true,
      colors,
      tokenColors,
    },
    pairs,
    adjustments,
  };
}
