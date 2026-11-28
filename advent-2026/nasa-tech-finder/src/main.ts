import "./style.css";
import { mountAttribution } from "@advent/attribution";
import { sources } from "../lib/sources.js";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

mountAttribution($("attribution"), sources);

interface Item {
  id: string;
  title: string;
  url: string;
  similarity: number;
  center: string;
}
interface PatentOut extends Item {
  category: string;
  description: string;
}
interface ReportOut extends Item {
  year: number | null;
  type: string;
  abstract: string | null;
}
interface SearchOut {
  problem: string;
  understood: { needEn: string; queries: string[] };
  explanation: { overview: string; picks: { id: string; why: string; how: string }[]; caution: string };
  check: { unknownIds: string[]; unmatchedNumbers: string[] };
  patents: PatentOut[];
  reports: ReportOut[];
  reportsFound: number;
  index: { patents: number; fetchedAt: string; model: string };
  cached?: boolean;
}

// ---------- タブ ----------
const tabs = [$("tab-find"), $("tab-api")];
function selectTab(i: number) {
  tabs.forEach((t, j) => {
    t.setAttribute("aria-selected", String(i === j));
    t.tabIndex = i === j ? 0 : -1;
    $(t.getAttribute("aria-controls")!).hidden = i !== j;
  });
  if (i === 1) renderApiDocs();
}
tabs.forEach((t, i) => {
  t.onclick = () => selectTab(i);
  t.onkeydown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      selectTab(1 - i);
      tabs[1 - i].focus();
    }
  };
});

// ---------- 例 ----------
const EXAMPLES = [
  "寒い場所でも電池を長持ちさせたい",
  "工場の配管の小さな水漏れを早く見つけたい",
  "災害現場でがれきの下の人を探したい",
  "高齢者の転倒を見守るセンサーがほしい",
  "飲み水を少ないエネルギーできれいにしたい",
];
$("examples").innerHTML = EXAMPLES.map((x) => `<button type="button" class="chip">${esc(x)}</button>`).join("");
$("examples").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button.chip");
  if (b) $<HTMLTextAreaElement>("problem").value = b.textContent ?? "";
});

// ---------- 探す ----------
let last: SearchOut | null = null;
let status: unknown = null;

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const problem = $<HTMLTextAreaElement>("problem").value.trim();
  if (!problem) return;
  const btn = $<HTMLButtonElement>("go");
  btn.disabled = true;
  $("error").hidden = true;
  $("busy").hidden = false;
  try {
    const r = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? `エラー（HTTP ${r.status}）`);
    last = j;
    render(j);
    // &open=ID で、その候補の「詳しく」を開いた状態にする（共有用）
    const open = new URLSearchParams(location.search).get("open");
    if (open) document.querySelector<HTMLButtonElement>(`button.detail-btn[data-id="${CSS.escape(open)}"]`)?.click();
  } catch (err) {
    $("error").textContent = (err as Error).message;
    $("error").hidden = false;
  } finally {
    btn.disabled = false;
    $("busy").hidden = true;
  }
});

const bar = (s: number) => `<span class="sim" title="課題との近さ（コサイン類似度）"><i style="width:${Math.max(0, Math.min(1, s)) * 100}%"></i></span><span class="muted small">${s.toFixed(2)}</span>`;

function render(j: SearchOut) {
  const byId = new Map<string, { kind: string; item: Item }>([
    ...j.patents.map((p) => [p.id, { kind: "特許", item: p }] as const),
    ...j.reports.map((r) => [r.id, { kind: "報告書", item: r }] as const),
  ]);
  $("overview").textContent = j.explanation.overview;
  $("picks").innerHTML = j.explanation.picks.length
    ? j.explanation.picks
        .map((p) => {
          const c = byId.get(p.id)!;
          return `<li>
            <p class="pick-title"><span class="badge ${c.kind === "特許" ? "b-patent" : "b-report"}">${c.kind}</span>
              <a href="${esc(c.item.url)}" target="_blank" rel="noopener">${esc(c.item.title)}</a> <span class="muted small">${esc(p.id)}</span></p>
            <p><b>使えそうな理由：</b>${esc(p.why)}</p>
            <p><b>仕組み：</b>${esc(p.how)}</p>
            ${detailButton(c.kind === "特許" ? "patent" : "report", p.id)}
          </li>`;
        })
        .join("")
    : `<li class="muted">関係の強い技術は見つかりませんでした。下の一覧も見てください。</li>`;
  $("caution").textContent = j.explanation.caution;
  const notes: string[] = [];
  notes.push(
    j.check.unmatchedNumbers.length
      ? `<span class="warn">⚠ 候補の説明文と照合できなかった数字：${esc(j.check.unmatchedNumbers.join("、"))}</span>`
      : `<span class="ok">✓ 説明の中の数字は、すべて候補の説明文にあるものでした</span>`,
  );
  if (j.check.unknownIds.length) notes.push(`<span class="warn">候補にない ID を AI が挙げたので除きました：${esc(j.check.unknownIds.join("、"))}</span>`);
  notes.push(`<span class="muted">Claude による説明${j.cached ? "（保存した結果）" : ""}。並び順の「近さ」は Voyage AI のベクトルで計算しています。</span>`);
  $("check").innerHTML = notes.join("<br>");
  $("understood").innerHTML = `求めている機能：${esc(j.understood.needEn)}<br>報告書の検索語：${j.understood.queries.map((q) => `<code>${esc(q)}</code>`).join(" ")}`;

  $("patent-note").textContent = `（${j.index.patents}件の中から、課題に近い順に${j.patents.length}件）`;
  $("patents").innerHTML = j.patents
    .map(
      (p) => `<li><div class="li-head">${bar(p.similarity)} <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></div>
        <p class="muted small">${esc(p.category)}・${esc(p.center)}・${esc(p.id)}</p>
        <p class="desc">${esc(p.description.slice(0, 220))}${p.description.length > 220 ? "…" : ""}</p>${detailButton("patent", p.id)}</li>`,
    )
    .join("");
  $("report-note").textContent = `（NTRS で見つかった${j.reportsFound}件を、課題に近い順に並べ直した上位${j.reports.length}件）`;
  $("reports").innerHTML = j.reports.length
    ? j.reports
        .map(
          (r) => `<li><div class="li-head">${bar(r.similarity)} <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a></div>
        <p class="muted small">${r.year ?? "年不明"}・${esc(r.type)}${r.center ? `・${esc(r.center)}` : ""}</p>
        ${r.abstract ? `<p class="desc">${esc(r.abstract.slice(0, 220))}${r.abstract.length > 220 ? "…" : ""}</p>` : `<p class="muted small">要約は NTRS のページで読めます</p>`}${detailButton("report", r.id)}</li>`,
        )
        .join("")
    : `<li class="muted">見つかりませんでした</li>`;
  $("result").hidden = false;
}

// ---------- 1件を詳しく（解説と活用プラン） ----------
interface DetailOut {
  problem: string;
  kind: "patent" | "report";
  id: string;
  title: string;
  url: string;
  detail: {
    oneLine: string;
    analogy: string;
    howItWorks: string[];
    whatsNew: string;
    everydayUses: string[];
    limits: string[];
    plan: { fit: string; questions: string[]; firstSteps: string[] };
  };
  check: { unmatchedNumbers: string[] };
  nextSteps: { links: { label: string; url: string }[]; notes: string[] };
  cached?: boolean;
}
let lastDetail: DetailOut | null = null;

function detailButton(kind: "patent" | "report", id: string) {
  return `<div class="detail-wrap"><button type="button" class="detail-btn" data-kind="${kind}" data-id="${esc(id)}" aria-expanded="false">詳しく・活用プラン</button><div class="detail" hidden></div></div>`;
}

const ul = (xs: string[]) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
const ol = (xs: string[]) => `<ol>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`;

function renderDetail(j: DetailOut): string {
  const d = j.detail;
  return `
    <h3>詳しい解説</h3>
    <p class="one-line">${esc(d.oneLine)}</p>
    <p><b>たとえると：</b>${esc(d.analogy)}</p>
    <p><b>仕組み：</b></p>${ol(d.howItWorks)}
    <p><b>新しいところ：</b>${esc(d.whatsNew)}</p>
    ${d.everydayUses.length ? `<p><b>使い道の例：</b></p>${ul(d.everydayUses)}` : ""}
    ${d.limits.length ? `<p><b>弱み・注意点：</b></p>${ul(d.limits)}` : ""}
    <h3>あなたの課題への活用プラン</h3>
    <p>${esc(d.plan.fit)}</p>
    <p><b>確かめること：</b></p>${ul(d.plan.questions)}
    <p><b>最初の一歩：</b></p>${ol(d.plan.firstSteps)}
    <h3>使いたいときは</h3>
    <ul class="links">${j.nextSteps.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join("")}</ul>
    <ul class="muted small">${j.nextSteps.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
    <p class="small">${
      j.check.unmatchedNumbers.length
        ? `<span class="warn">⚠ 説明文と照合できなかった数字：${esc(j.check.unmatchedNumbers.join("、"))}</span>`
        : `<span class="ok">✓ 解説の中の数字は、すべて説明文にあるものでした</span>`
    }<br><span class="muted">Claude による解説${j.cached ? "（保存した結果）" : ""}。説明文に書いていないことは「推測」「書かれていない」と分けています。「使いたいときは」は NASA のページの内容です。</span></p>`;
}

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button.detail-btn");
  if (!btn || !last) return;
  const box = btn.nextElementSibling as HTMLElement;
  // 開いているものは閉じる。読み込んだものは、もう一度押したら開くだけ
  if (btn.getAttribute("aria-expanded") === "true") {
    box.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    return;
  }
  btn.setAttribute("aria-expanded", "true");
  box.hidden = false;
  if (box.dataset.loaded) return;
  btn.disabled = true;
  box.innerHTML = `<p class="muted">解説を書いています…（15秒ほど）</p>`;
  try {
    const r = await fetch("/api/detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem: last.problem, kind: btn.dataset.kind, id: btn.dataset.id }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? `エラー（HTTP ${r.status}）`);
    lastDetail = j;
    box.innerHTML = renderDetail(j);
    box.dataset.loaded = "1";
  } catch (err) {
    box.innerHTML = `<p class="warn">${esc((err as Error).message)}</p>`;
  } finally {
    btn.disabled = false;
  }
});

// ?q=課題 で開くと、その課題で探す（結果を共有するリンクに使える。同じ課題は保存した結果が返るので回数を使わない）
{
  const q = new URLSearchParams(location.search).get("q");
  if (q) {
    $<HTMLTextAreaElement>("problem").value = q.slice(0, 500);
    $<HTMLFormElement>("form").requestSubmit();
  }
}

// ---------- API の使い方 ----------
async function renderApiDocs() {
  const o = location.origin;
  if (!status) status = await fetch("/api/status").then((r) => r.json()).catch(() => null);
  const problem = last?.problem ?? $<HTMLTextAreaElement>("problem").value.trim() ?? EXAMPLES[0];
  const cmd = `curl -X POST ${o}/api/search \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify({ problem: problem || EXAMPLES[0] }).replace(/'/g, `'\\''`)}'`;
  const trimmed = last
    ? { ...last, patents: last.patents.slice(0, 1).map((p) => ({ ...p, description: p.description.slice(0, 120) + "…" })), reports: last.reports.slice(0, 1) }
    : null;
  $("api-docs").innerHTML = `
    <p>この画面の中身は、下の2つの API です。キーは不要で、ほかのサイトやスクリプトからも呼べます（CORS を許可）。実行結果は、この画面で実際に受け取った応答です。</p>
    <h3><code>POST /api/search</code></h3>
    <p class="small">課題（5〜500字）から、近い特許（上位8件）と技術報告書（上位6件）を探し、AI が最大5件を選んで説明します。<code>explanation.picks[].id</code> は <code>patents</code>・<code>reports</code> の ID と照合済み、<code>check.unmatchedNumbers</code> は説明文の数字のうち候補の説明文にないもの。AI を使うので全体で1日10回・IP ごとに3回まで（同じ課題は保存した結果を返す）。</p>
    <pre><code>${esc(cmd)}</code></pre>
    <h4>実行結果</h4>
    ${trimmed ? `<pre class="json"><code>${esc(JSON.stringify(trimmed, null, 2))}</code></pre><p class="muted small">「技術を探す」で実際に受け取った応答。特許と報告書は1件ずつ、特許の説明文は先頭だけにしています。</p>` : `<p class="muted small">「技術を探す」で探すと、ここに実際の応答が出ます（回数に限りがあるので、このタブからは実行しません）。</p>`}
    <h3><code>POST /api/detail</code></h3>
    <p class="small">1件の特許（<code>kind: "patent"</code>）か報告書（<code>"report"</code>）を、課題に合わせて詳しく解説し、活用プラン（当てはめ方・確かめること・最初の一歩）と、NASA の問い合わせ・ライセンスのページへのリンクを返します。全体で1日30回・IP ごとに10回まで（同じ課題・同じ候補は保存した結果を返す）。</p>
    <pre><code>${esc(`curl -X POST ${o}/api/detail \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(lastDetail ? { problem: lastDetail.problem, kind: lastDetail.kind, id: lastDetail.id } : { problem: problem || EXAMPLES[0], kind: "patent", id: last?.patents[0]?.id ?? "LEW-TOPS-184" }).replace(/'/g, `'\\''`)}'`)}</code></pre>
    <h4>実行結果</h4>
    ${lastDetail ? `<pre class="json"><code>${esc(JSON.stringify(lastDetail, null, 2))}</code></pre><p class="muted small">「詳しく・活用プラン」で実際に受け取った応答。</p>` : `<p class="muted small">「詳しく・活用プラン」を押すと、ここに実際の応答が出ます。</p>`}
    <h3><code>GET /api/status</code></h3>
    <p class="small">探せる特許の件数・分野ごとの件数・データを集めた日時。</p>
    <pre><code>curl ${esc(o)}/api/status</code></pre>
    <h4>実行結果</h4>
    ${status ? `<pre class="json"><code>${esc(JSON.stringify(status, null, 2))}</code></pre>` : `<p class="muted small">取得できませんでした</p>`}`;
}
