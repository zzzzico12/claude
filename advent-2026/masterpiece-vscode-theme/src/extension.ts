// VS Code 拡張機能の本体。テーマ（themes/*.json）は事前に作ってあり、ここでは AI を呼ばない。
// - 天気（Open-Meteo）と時間帯から絵の雰囲気を決め、合う絵のテーマに切り替える（設定でオンにしたときだけ）
// - いまの絵の解説を表示する
// - いまの絵をエクスプローラーの下にずっと表示しておく
import * as vscode from "vscode";
import paintingsData from "../lib/paintings-data.json" with { type: "json" };
import { MOOD_JA, moodOf, pickPainting, type Mood, type PaintingInfo, type WeatherNow } from "../lib/paintings.js";

const paintings = paintingsData as unknown as PaintingInfo[];
const byLabel = new Map(paintings.map((p) => [p.label, p]));
const CONFIG = "masterpieceTheme";

let status: vscode.StatusBarItem;
/** 拡張機能の場所（同梱した絵の画像 media/*.jpg を読むため） */
let extUri: vscode.Uri;
let timer: NodeJS.Timeout | undefined;
let lastMood: Mood | null = null;

function settings() {
  const c = vscode.workspace.getConfiguration(CONFIG);
  return {
    autoSwitch: c.get<boolean>("autoSwitch", false),
    latitude: c.get<number>("latitude", 35.68),
    longitude: c.get<number>("longitude", 139.69),
    intervalMinutes: Math.max(15, c.get<number>("intervalMinutes", 60)),
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const currentThemeLabel = () => vscode.workspace.getConfiguration("workbench").get<string>("colorTheme") ?? "";
const currentPainting = () => byLabel.get(currentThemeLabel()) ?? null;

async function setTheme(p: PaintingInfo) {
  if (currentThemeLabel() !== p.label) {
    await vscode.workspace.getConfiguration("workbench").update("colorTheme", p.label, vscode.ConfigurationTarget.Global);
  }
  updateStatus();
}

function updateStatus() {
  paintingView?.refresh();
  const p = currentPainting();
  if (!p) {
    status.hide();
    return;
  }
  status.text = `$(symbol-color) ${p.titleJa}${lastMood ? ` · ${MOOD_JA[lastMood]}` : ""}`;
  status.tooltip = `${p.label}\nクリックで絵の解説を表示`;
  status.show();
}

// ---------- いまの絵をずっと表示しておくパネル（エクスプローラーの下。ドラッグで右側のサイドバーにも移せる） ----------
// エディタの背景に画像を敷く公式の方法はないので、絵は横に表示する（VS Code 本体のファイルは書き換えない）

const ROLE_JA: Record<string, string> = {
  background: "背景",
  foreground: "文字",
  keyword: "キーワード",
  string: "文字列",
  function: "関数",
  type: "型",
  number: "数値",
  comment: "コメント",
};

function nonce() {
  let s = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/**
 * 絵の画像は拡張機能に同梱している（media/<作品ID>.jpg、幅400px、パブリックドメイン）。
 * Webview の <img> から美術館のサーバーを直接読むと、名乗るためのヘッダー（AIC-User-Agent）を付けられず、
 * ボット確認のページが返って表示されなかったため
 */
const imageFor = (webview: vscode.Webview, p: PaintingInfo) => webview.asWebviewUri(vscode.Uri.joinPath(extUri, "media", `${p.id}.jpg`)).toString();
const webviewOptions = () => ({ enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extUri, "media")] });

class PaintingViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    view.webview.options = webviewOptions();
    view.webview.onDidReceiveMessage((m: { command?: string }) => {
      if (m.command === "about" || m.command === "pick") void vscode.commands.executeCommand(`${CONFIG}.${m.command}`);
    });
    view.onDidChangeVisibility(() => view.visible && this.refresh());
    this.refresh();
  }

  refresh() {
    if (!this.view) return;
    const p = currentPainting();
    const n = nonce();
    const csp = `default-src 'none'; img-src ${this.view.webview.cspSource}; style-src 'unsafe-inline'; script-src 'nonce-${n}';`;
    const script = `<script nonce="${n}">const vscode=acquireVsCodeApi();for(const el of document.querySelectorAll("[data-cmd]"))el.addEventListener("click",()=>vscode.postMessage({command:el.dataset.cmd}));</script>`;
    const style = `<style>
body{padding:8px 10px;margin:0;color:var(--vscode-foreground);font-family:var(--vscode-font-family);font-size:12px;line-height:1.6}
img{width:100%;height:auto;border-radius:4px;cursor:pointer;display:block}
.t{font-weight:600;margin:6px 0 0}.a{opacity:.75}
.strip{display:flex;margin-top:8px;border-radius:3px;overflow:hidden;height:14px}
.strip span{flex:1}
button{margin-top:8px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;padding:4px 10px;border-radius:2px;cursor:pointer;font:inherit}
.muted{opacity:.75}
</style>`;
    if (!p) {
      this.view.webview.html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}">${style}</head><body>
<p class="muted">いまのテーマは名画テーマではありません。</p><button data-cmd="pick">絵を選ぶ</button>${script}</body></html>`;
      return;
    }
    // 色の帯：絵から取ってテーマに使った色（背景から順に）。マウスを乗せると役割が出る
    const strip = p.adjustments
      .map((a) => `<span style="background:${a.adjusted}" title="${ROLE_JA[a.role] ?? a.role} ${a.adjusted}"></span>`)
      .join("");
    this.view.webview.html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}">${style}</head><body>
<img src="${imageFor(this.view.webview, p)}" alt="${esc(p.titleJa)}" title="クリックで解説を表示" data-cmd="about">
<p class="t">${esc(p.titleJa)}</p>
<p class="a">${esc(p.artistJa)}${p.date ? `・${esc(p.date)}` : ""}</p>
<div class="strip" title="この絵から取った色">${strip}</div>
<p class="muted">シカゴ美術館（CC0）</p>
${script}</body></html>`;
  }
}

let paintingView: PaintingViewProvider | undefined;

/** Open-Meteo（キー不要・非商用は無料）から、いまの天気と日の出・日の入りを取る */
async function fetchWeather(lat: number, lon: number): Promise<WeatherNow> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "weather_code,wind_speed_10m,is_day",
    daily: "sunrise,sunset",
    timezone: "auto",
    forecast_days: "1",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo が HTTP ${res.status}`);
  const d = (await res.json()) as {
    utc_offset_seconds: number;
    current: { time: string; weather_code: number; wind_speed_10m: number; is_day: number };
    daily: { sunrise: string[]; sunset: string[] };
  };
  // 時刻は現地時間（タイムゾーンなし）で返るので、同じ基準のまま差を取る
  const t = (s: string) => Date.parse(`${s}Z`);
  const now = t(d.current.time);
  const minutes = (ms: number) => Math.round(ms / 60000);
  return {
    code: d.current.weather_code,
    windKmh: d.current.wind_speed_10m,
    isDay: d.current.is_day === 1,
    minutesFromSunrise: d.daily.sunrise[0] ? minutes(now - t(d.daily.sunrise[0])) : null,
    minutesToSunset: d.daily.sunset[0] ? minutes(t(d.daily.sunset[0]) - now) : null,
  };
}

async function switchByWeather(showMessage = false) {
  const s = settings();
  try {
    const w = await fetchWeather(s.latitude, s.longitude);
    lastMood = moodOf(w);
    const day = Math.floor(Date.now() / 86_400_000);
    const { painting, matched } = pickPainting(paintings, lastMood, day);
    await setTheme(painting);
    if (showMessage) {
      const note = matched === lastMood ? "" : `（「${MOOD_JA[lastMood]}」の絵がないので「${MOOD_JA[matched]}」の絵）`;
      vscode.window.showInformationMessage(`いまは「${MOOD_JA[lastMood]}」。${painting.label} にしました${note}`);
    }
  } catch (err) {
    if (showMessage) vscode.window.showWarningMessage(`天気を取得できませんでした：${(err as Error).message}`);
  }
}

function schedule() {
  if (timer) clearInterval(timer);
  timer = undefined;
  const s = settings();
  if (!s.autoSwitch) return;
  void switchByWeather();
  timer = setInterval(() => void switchByWeather(), s.intervalMinutes * 60_000);
}


function showAbout(p: PaintingInfo) {
  const panel = vscode.window.createWebviewPanel("masterpieceTheme.about", p.titleJa, vscode.ViewColumn.Beside, webviewOptions());
  const roleNames: Record<string, string> = {
    background: "背景",
    foreground: "文字",
    keyword: "キーワード",
    string: "文字列",
    function: "関数",
    type: "型",
    number: "数値",
    comment: "コメント",
  };
  const swatches = p.adjustments
    .map(
      (a) =>
        `<li><span class="sw" style="background:${a.original}"></span><span class="sw" style="background:${a.adjusted}"></span>${roleNames[a.role] ?? a.role} <code>${a.adjusted}</code>${a.deltaE > 0.5 ? `<small>（読みやすさのため調整 ΔE ${a.deltaE}）</small>` : ""}</li>`,
    )
    .join("");
  panel.webview.html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${panel.webview.cspSource}; style-src 'unsafe-inline';">
<style>
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);line-height:1.7;padding:0 16px 24px;max-width:760px}
img{max-width:100%;border-radius:6px;margin-top:12px}
.sw{display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:4px;vertical-align:-2px;border:1px solid #8884}
ul{list-style:none;padding:0} small,.muted{opacity:.75} a{color:var(--vscode-textLink-foreground)}
</style></head><body>
<img src="${imageFor(panel.webview, p)}" alt="${esc(p.titleJa)}">
<h1>${esc(p.titleJa)}</h1>
<p class="muted">${esc(p.artistJa)}・${esc(p.date ?? "")}<br>${esc(p.title)}${p.artist ? ` / ${esc(p.artist)}` : ""}</p>
<p>${esc(p.explanation)}</p>
<h2>配色</h2>
<p>${esc(p.colorStory)}</p>
<p class="muted">雰囲気：${p.moods.map((m) => MOOD_JA[m]).join("・")}</p>
<ul>${swatches}</ul>
<p class="muted">左が絵から取り出した色、右がテーマで使っている色。文字の色はすべて、背景とのコントラスト比 4.5:1（WCAG AA）以上に調整しています。</p>
<h2>出典</h2>
<p class="muted">画像と作品データ：<a href="${esc(p.pageUrl)}">${esc(p.credit)}</a>（${esc(p.license)}）<br>
天気：<a href="https://open-meteo.com/">Open-Meteo</a>（CC BY 4.0、非商用は無料）<br>
解説と色の割り当て：AI（Claude）が作成。誤りがありえます。</p>
</body></html>`;
}

export function activate(context: vscode.ExtensionContext) {
  extUri = context.extensionUri;
  paintingView = new PaintingViewProvider();
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(`${CONFIG}.painting`, paintingView));
  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.command = `${CONFIG}.about`;
  context.subscriptions.push(
    status,
    vscode.commands.registerCommand(`${CONFIG}.about`, () => {
      const p = currentPainting();
      if (p) showAbout(p);
      else vscode.window.showInformationMessage("いまのテーマは名画テーマではありません。「名画テーマ: 絵を選ぶ」から選べます");
    }),
    vscode.commands.registerCommand(`${CONFIG}.pick`, async () => {
      const item = await vscode.window.showQuickPick(
        paintings.map((p) => ({
          label: p.titleJa,
          description: `${p.artistJa}・${p.roles.type === "dark" ? "ダーク" : "ライト"}`,
          detail: p.moods.map((m) => MOOD_JA[m]).join("・"),
          p,
        })),
        { placeHolder: "テーマにする絵を選ぶ" },
      );
      if (item) await setTheme(item.p);
    }),
    vscode.commands.registerCommand(`${CONFIG}.enableAutoSwitch`, async () => {
      await vscode.workspace.getConfiguration(CONFIG).update("autoSwitch", true, vscode.ConfigurationTarget.Global);
      await switchByWeather(true);
    }),
    vscode.commands.registerCommand(`${CONFIG}.disableAutoSwitch`, async () => {
      await vscode.workspace.getConfiguration(CONFIG).update("autoSwitch", false, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage("天気と時間による切り替えを止めました");
    }),
    vscode.commands.registerCommand(`${CONFIG}.switchNow`, () => switchByWeather(true)),
    // パネルを開く（閉じてしまったとき用）。VS Code がビューごとに作る「.focus」コマンドを呼ぶ
    vscode.commands.registerCommand(`${CONFIG}.showPainting`, () => vscode.commands.executeCommand(`${CONFIG}.painting.focus`)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG)) schedule();
      if (e.affectsConfiguration("workbench.colorTheme")) updateStatus();
    }),
    { dispose: () => timer && clearInterval(timer) },
  );
  updateStatus();
  schedule();
}

export function deactivate() {
  if (timer) clearInterval(timer);
}
