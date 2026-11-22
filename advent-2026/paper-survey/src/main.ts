import { mountAttribution } from "@advent/attribution";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { sources } from "../lib/sources.js";

interface PaperRow {
  n: number;
  id: string;
  title: string;
  year: number;
  citedBy: number;
  venue: string | null;
  firstAuthor: string | null;
  doi: string | null;
  oaUrl: string | null;
  oaSource: "arxiv" | "openalex" | "unpaywall" | null;
  score: { total: number; relevance: number; citations: number; recency: number };
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("form");
const themeInput = $<HTMLInputElement>("theme");
const period = $<HTMLSelectElement>("period");
const submit = $<HTMLButtonElement>("submit");
const status = $<HTMLParagraphElement>("status");
const result = $<HTMLElement>("result");
const survey = $<HTMLElement>("survey");
const check = $<HTMLElement>("check");
const queries = $<HTMLParagraphElement>("queries");
const tbody = document.querySelector<HTMLTableSectionElement>("#papers tbody")!;

mountAttribution($("attribution"), sources);

for (const b of document.querySelectorAll<HTMLButtonElement>("#examples button")) {
  b.addEventListener("click", () => {
    themeInput.value = b.textContent ?? "";
    form.requestSubmit();
  });
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** 本文の [3] や [2, 5] を、表の行へのリンクにする */
function linkCitations(md: string): string {
  return md.replace(/\[(\d+(?:\s*[,，、]\s*\d+)*)\](?!\()/g, (_, nums: string) =>
    nums
      .split(/[,，、]/)
      .map((n) => `<a class="cite" href="#paper-${n.trim()}">[${n.trim()}]</a>`)
      .join(""),
  );
}

let text = "";
let renderQueued = false;
function renderSurvey() {
  renderQueued = false;
  survey.innerHTML = DOMPurify.sanitize(marked.parse(linkCitations(text), { async: false }));
}
function queueRender() {
  if (!renderQueued) {
    renderQueued = true;
    requestAnimationFrame(renderSurvey);
  }
}

const OA_LABEL = { arxiv: "arXiv", openalex: "PDF / 本文", unpaywall: "PDF / 本文" } as const;

function renderPapers(papers: PaperRow[]) {
  tbody.innerHTML = papers
    .map((p) => {
      const link = p.doi ? `https://doi.org/${p.doi}` : `https://openalex.org/${p.id}`;
      const oa = p.oaUrl
        ? `<a href="${escape(p.oaUrl)}" target="_blank" rel="noopener">${OA_LABEL[p.oaSource ?? "openalex"]}</a>`
        : `<span class="muted">なし</span>`;
      const meta = [p.firstAuthor ? `${escape(p.firstAuthor)} ほか` : "", p.venue ? escape(p.venue) : ""]
        .filter(Boolean)
        .join(" ・ ");
      const s = p.score;
      return `<tr id="paper-${p.n}">
        <td class="num">${p.n}</td>
        <td><a href="${escape(link)}" target="_blank" rel="noopener">${escape(p.title)}</a><div class="meta">${meta}</div></td>
        <td class="num">${p.year}</td>
        <td class="num">${p.citedBy.toLocaleString("ja-JP")}</td>
        <td>${oa}</td>
        <td class="num" title="関連度 ${s.relevance} ／ 引用 ${s.citations} ／ 新しさ ${s.recency}">${s.total.toFixed(2)}</td>
      </tr>`;
    })
    .join("");
}

function renderCheck(c: { invalidCitations: number[]; uncitedPapers: number[]; unmatchedNumbers: string[]; citationCount: number }) {
  const ok = (b: boolean) => (b ? `<span class="ok">✓</span>` : `<span class="warn">！</span>`);
  check.hidden = false;
  check.innerHTML = `<h2>自動チェック</h2><ul>
    <li>${ok(c.invalidCitations.length === 0)} 根拠の番号 ${c.citationCount}か所：${
      c.invalidCitations.length ? `リストにない番号 ${c.invalidCitations.map((n) => `[${n}]`).join(" ")}` : "すべて実在する論文を指している"
    }</li>
    <li>${ok(c.uncitedPapers.length === 0)} ${
      c.uncitedPapers.length ? `解説で使われなかった論文：${c.uncitedPapers.map((n) => `[${n}]`).join(" ")}` : "20本すべてが解説で使われている"
    }</li>
    <li>${ok(c.unmatchedNumbers.length === 0)} ${
      c.unmatchedNumbers.length
        ? `元データ（抄録・年・引用数）にない数字：${c.unmatchedNumbers.map(escape).join("、")}`
        : "本文の数字はすべて元データと一致"
    }</li>
  </ul>`;
}

function setStatus(msg: string, kind: "info" | "error" = "info") {
  status.hidden = false;
  status.textContent = msg;
  status.className = `status ${kind}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const theme = themeInput.value.trim();
  if (!theme) return;
  submit.disabled = true;
  result.hidden = true;
  check.hidden = true;
  text = "";
  survey.innerHTML = "";
  tbody.innerHTML = "";
  queries.textContent = "";
  setStatus("論文を探しています…（全体で1分ほどかかります）");

  try {
    const res = await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, fromYear: new Date().getFullYear() - Number(period.value) }),
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({ error: `エラー（HTTP ${res.status}）` }));
      setStatus(err.error, "error");
      return;
    }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines.filter(Boolean)) {
        const ev = JSON.parse(line);
        switch (ev.type) {
          case "queries":
            queries.textContent = `検索語：${ev.queries.join(" ／ ")}（候補 ${ev.candidateCount}本）`;
            setStatus("無料で読めるリンクを探しています…");
            break;
          case "papers":
            renderPapers(ev.papers);
            result.hidden = false;
            setStatus("AIが抄録を読んで解説を書いています…");
            break;
          case "text":
            text += ev.delta;
            queueRender();
            break;
          case "check":
            renderCheck(ev);
            break;
          case "done":
            renderSurvey();
            setStatus(ev.cached ? "完了（以前に調べた結果を表示しています）" : "完了");
            break;
          case "error":
            setStatus(ev.message, "error");
            break;
        }
      }
    }
  } catch {
    setStatus("通信エラーが起きました。時間をおいて試してください", "error");
  } finally {
    submit.disabled = false;
  }
});
