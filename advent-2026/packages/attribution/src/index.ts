// データの出典を、画面（HTML）と README（Markdown）の両方に同じ内容で出すための部品。
// 各アプリは sources.ts などに Source の配列を 1 か所だけ書き、両方の表示をそこから作る。

export interface Source {
  /** データ名（例: "OpenAlex Works"） */
  name: string;
  /** 提供元（例: "OurResearch"） */
  provider: string;
  url: string;
  /** ライセンス名（例: "CC0 1.0"） */
  license: string;
  licenseUrl?: string;
  /** 取得日（YYYY-MM-DD）。リアルタイムに取る場合は "リアルタイム取得" など */
  retrievedAt: string;
  /** 提供元が求めるクレジット表記があればそのまま書く */
  credit?: string;
  /** 非商用条件があるデータか（README と画面に明記する） */
  nonCommercial?: boolean;
  note?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const escapeMd = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

function check(sources: Source[]) {
  for (const s of sources) {
    for (const key of ["name", "provider", "url", "license", "retrievedAt"] as const) {
      if (!s[key]) throw new Error(`出典「${s.name ?? "?"}」に ${key} がありません`);
    }
  }
}

/** README 用の Markdown の表 */
export function toMarkdown(sources: Source[]): string {
  check(sources);
  const rows = sources.map((s) => {
    const license = s.licenseUrl ? `[${escapeMd(s.license)}](${s.licenseUrl})` : escapeMd(s.license);
    const notes = [s.nonCommercial ? "**非商用**" : "", s.credit ? `表記: ${s.credit}` : "", s.note ?? ""]
      .filter(Boolean)
      .map(escapeMd)
      .join(" / ");
    return `| [${escapeMd(s.name)}](${s.url}) | ${escapeMd(s.provider)} | ${license} | ${escapeMd(s.retrievedAt)} | ${notes} |`;
  });
  return ["| データ | 提供元 | ライセンス | 取得日 | 備考 |", "| --- | --- | --- | --- | --- |", ...rows].join("\n");
}

const LABELS = {
  ja: { title: "データの出典", retrieved: "取得日 ", nonCommercial: "非商用", open: "（", close: "）", sep: "・" },
  en: { title: "Data sources", retrieved: "retrieved ", nonCommercial: "Non-commercial", open: " (", close: ")", sep: " · " },
};

export interface HtmlOptions {
  title?: string;
  /** 画面の言語（既定は日本語）。Source の中身は呼び出し側でその言語のものを渡す */
  lang?: "ja" | "en";
}

/** 画面用の HTML（<footer> 1 つ）。スタイルは各アプリで .attribution に当てる */
export function toHtml(sources: Source[], { title, lang = "ja" }: HtmlOptions = {}): string {
  const L = LABELS[lang];
  title ??= L.title;
  check(sources);
  const items = sources.map((s) => {
    const license = s.licenseUrl
      ? `<a href="${escapeHtml(s.licenseUrl)}" target="_blank" rel="noopener">${escapeHtml(s.license)}</a>`
      : escapeHtml(s.license);
    const extras = [
      s.credit ? escapeHtml(s.credit) : "",
      s.nonCommercial ? `<strong>${L.nonCommercial}</strong>` : "",
      s.note ? escapeHtml(s.note) : "",
    ].filter(Boolean);
    return (
      `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>` +
      `${L.open}${escapeHtml(s.provider)}${L.close}${L.sep}${license}${L.sep}${L.retrieved}${escapeHtml(s.retrievedAt)}` +
      (extras.length ? `${L.sep}${extras.join(L.sep)}` : "") +
      `</li>`
    );
  });
  return `<footer class="attribution"><h2>${escapeHtml(title)}</h2><ul>${items.join("")}</ul></footer>`;
}

/** ブラウザで要素の中に出典を描く */
export function mountAttribution(el: Element, sources: Source[], opts?: HtmlOptions): void {
  el.innerHTML = toHtml(sources, opts);
}
