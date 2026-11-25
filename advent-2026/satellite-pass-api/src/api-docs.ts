// 「API の使い方」タブ：今の画面の入力に合わせたコマンドと、画面が実際に受け取った応答（実行結果）を出す
// 応答は作り話のサンプルではなく、この画面で調べたときに API が返したもの（長い部分は短くする）
import { lang, t } from "./i18n.js";

export interface ApiDocsState {
  /** 今の入力（場所・緯度経度・衛星・日数） */
  query: Record<string, string>;
  /** /api/passes の応答（画面が path=1 で取ったもの） */
  passes: { passes: Record<string, unknown>[] } | null;
  sats: { satellites: unknown[] } | null;
  ask: { question: string; response: { prediction?: { passes: Record<string, unknown>[] } } } | null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** シェルの '...' の中に入れられる形にする */
const sq = (s: string) => s.replace(/'/g, `'\\''`);

/** 通過は1件だけにし、画面用の path は外す（コマンドは path なしなので） */
function trimPasses<T extends { passes: Record<string, unknown>[] }>(r: T): T {
  return { ...r, passes: r.passes.slice(0, 1).map(({ path: _path, ...p }) => p) };
}

function block(id: string, command: string, result: unknown | null, note: string, empty: string): string {
  return `
    <div class="cmd">
      <pre id="${id}"><code>${esc(command)}</code></pre>
      <button type="button" class="copy" data-copy="${id}">${t.apiCopy}</button>
    </div>
    <h4>${t.apiResult}</h4>
    ${
      result
        ? `<pre class="json"><code>${esc(JSON.stringify(result, null, 2))}</code></pre><p class="muted small">${esc(note)}</p>`
        : `<p class="muted small">${esc(empty)}</p>`
    }`;
}

export function renderApiDocs(el: HTMLElement, s: ApiDocsState) {
  const o = location.origin;
  const q = s.query;
  const loc = q.lat ? `-d lat=${q.lat} -d lon=${q.lon}` : `--data-urlencode 'place=${sq(q.place ?? "")}'`;
  const passesCmd = `curl -G ${o}/api/passes \\\n  ${loc} -d sat=${q.sat} -d days=${q.days}${lang === "en" ? " -d lang=en" : ""}`;

  const question = s.ask?.question ?? t.askPlaceholder.replace(/^(例：|e\.g\. )/, "");
  const askCmd = `curl -X POST ${o}/api/ask \\\n  -H 'Content-Type: application/json' \\\n  -d '${sq(JSON.stringify({ question, lang }))}'`;
  const askResult = s.ask?.response.prediction ? { ...s.ask.response, prediction: trimPasses(s.ask.response.prediction) } : (s.ask?.response ?? null);

  const satsCmd = `curl ${o}/api/sats`;
  const satsResult = s.sats ? { ...s.sats, satellites: s.sats.satellites.slice(0, 3) } : null;

  el.innerHTML = `
    <p>${t.apiIntro}</p>

    <h3><code>GET /api/passes</code></h3>
    <p class="small">${t.apiPassesDesc}</p>
    <table class="params"><tbody>${t.apiParams.map(([k, v]) => `<tr><th><code>${k}</code></th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>
    ${block("cmd-passes", passesCmd, s.passes ? trimPasses(s.passes) : null, s.passes ? t.apiTrimmed(s.passes.passes.length) : "", t.apiNoResult)}

    <h3><code>POST /api/ask</code></h3>
    <p class="small">${t.apiAskDesc}</p>
    ${block("cmd-ask", askCmd, askResult, askResult?.prediction ? t.apiTrimmed(s.ask!.response.prediction!.passes.length) : "", t.apiAskNoResult)}

    <h3><code>GET /api/sats</code></h3>
    <p class="small">${t.apiSatsDesc}</p>
    ${block("cmd-sats", satsCmd, satsResult, s.sats ? t.apiSatsTrimmed(s.sats.satellites.length) : "", t.apiNoResult)}
  `;

  el.querySelectorAll<HTMLButtonElement>("button[data-copy]").forEach((b) => {
    b.onclick = async () => {
      const text = document.getElementById(b.dataset.copy!)?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        b.textContent = t.apiCopied;
        setTimeout(() => (b.textContent = t.apiCopy), 1500);
      } catch {
        // コピーできない環境では、選んでコピーしてもらう
      }
    };
  });
}
