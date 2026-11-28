import "./style.css";
import { mountAttribution } from "@advent/attribution";
import type { ModelComparison } from "../lib/compare.js";
import type { Row } from "../lib/data.js";
import { sources, sourcesEn } from "../lib/sources.js";
import { fmt, lang, switchLang, t } from "./i18n.js";
import { ASTEROID_MODEL, CompareScene, MODELS, PERSON_MODEL } from "./scene.js";

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const en = lang === "en";

document.documentElement.lang = lang;
document.title = t.title;
$("title").textContent = t.title;
$("lead").textContent = t.lead;
$("lang").textContent = t.switchTo;
$("lang").onclick = () => switchLang(en ? "ja" : "en");
$("assumption").textContent = t.assumption;
$("v-over").textContent = t.viewOverview;
$("v-human").textContent = t.viewHuman;
$("v-obj").textContent = t.viewObject;
$("v-note").textContent = t.vNote;
$("ai-title").textContent = t.aiTitle;
mountAttribution($("attribution"), en ? sourcesEn : sources, { lang });
const credits = [ASTEROID_MODEL, PERSON_MODEL, ...Object.values(MODELS)].map((m) => m.credit!);
const LICENSE_URL = { "CC-BY": "https://creativecommons.org/licenses/by/3.0/", CC0: "https://creativecommons.org/publicdomain/zero/1.0/", NASA: "https://www.nasa.gov/nasa-brand-center/images-and-media/" };
const link = (url: string, text: string) => `<a href="${url}" target="_blank" rel="noopener">${esc(text)}</a>`;
$("credits").innerHTML =
  t.credits +
  credits
    .map((c) =>
      c.via
        ? // Poly Pizza が求める形：Whale by sirkitree [CC-BY] via Poly Pizza
          `${link(c.url, c.title)} by ${esc(c.author)} [${link(LICENSE_URL[c.license], c.license)}] via ${link("https://poly.pizza", "Poly Pizza")}`
        : `${link(c.url, c.title)}: ${esc(c.author)} (${link(LICENSE_URL[c.license], "NASA")})`,
    )
    .join(" · ");

// 日時は、日本語は日本時間、英語は UTC（Day06・Day07 と同じ）
const tz = en ? "UTC" : "Asia/Tokyo";
const dateFmt = new Intl.DateTimeFormat(en ? "en-GB" : "ja-JP", { timeZone: tz, month: en ? "short" : "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
/** 比べる物の大きさの表示（Wikidata の 2737.414189 のような値を、4桁ほどに） */
const fmtM = (v: number) => fmt(v >= 100 ? Math.round(v) : Number(v.toPrecision(4)));
const name = (r: Row) => r.fullname.replace(/^\((.*)\)$/, "$1");

// URL の &cmp=・&view= は最初に開いたときだけ使う（select で URL を書き換えるので、先に読んでおく）
const initial = { cmp: new URLSearchParams(location.search).get("cmp"), view: new URLSearchParams(location.search).get("view") };
let rows: Row[] = [];
let sort: "time" | "dist" | "size" = "dist";
let selected: Row | null = null;
let compare: ModelComparison | null = null;
let scene: CompareScene | null = null;
try {
  scene = new CompareScene($("three"));
  scene.onAsteroidLabel = (m) => (selected && selected.facts.size.min !== selected.facts.size.max ? t.maxEstimate(fmt(Math.round(m))) : `${fmt(Math.round(m))} m`);
} catch {
  $("three").innerHTML = `<p class="muted">${en ? "3D is not available in this browser." : "このブラウザでは3D表示が使えません。"}</p>`;
}

$("status").textContent = t.loading;
try {
  const r = await fetch("/api/approaches");
  if (!r.ok) throw new Error();
  const j = (await r.json()) as { approaches: Row[]; objectsRetrievedAt: string };
  rows = j.approaches;
  $("status").textContent = t.objectsAt(j.objectsRetrievedAt.slice(0, 10));
  $("summary").textContent = t.sumShort(rows.length);
  renderSort();
  renderStrip();
  // URL の ?des= で選べる（共有用）。なければ、いちばん近いもの
  const want = new URLSearchParams(location.search).get("des");
  select(rows.find((x) => x.des === want) ?? sorted()[0]);
} catch {
  $("status").textContent = t.error;
}

function sorted() {
  return [...rows].sort((a, b) => (sort === "time" ? a.time.localeCompare(b.time) : sort === "dist" ? a.dist - b.dist : b.facts.size.max - a.facts.size.max));
}

function renderSort() {
  const opts: [typeof sort, string][] = [
    ["dist", t.sortDist],
    ["size", t.sortSize],
    ["time", t.sortTime],
  ];
  $("sort").innerHTML = opts.map(([k, l]) => `<button data-k="${k}" aria-pressed="${k === sort}">${l}</button>`).join("");
  $("sort")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          sort = b.dataset.k as typeof sort;
          renderSort();
          renderStrip();
          $("strip").scrollTo({ left: 0 });
        }),
    );
}

function renderStrip() {
  $("strip").innerHTML = sorted()
    .map(
      (r) => `<button class="card ${r === selected ? "on" : ""}" data-des="${esc(r.des)}" data-time="${r.time}" role="option" aria-selected="${r === selected}">
        <span class="c-date">${dateFmt.format(new Date(r.time))}</span>
        <b class="c-name">${esc(name(r))}</b>
        <span class="c-size">${t.meters(r.facts.size.min, r.facts.size.max)}</span>
        ${r.sentry ? `<span class="c-flag">Sentry</span>` : ""}
      </button>`,
    )
    .join("");
  $("strip")
    .querySelectorAll<HTMLButtonElement>(".card")
    .forEach((b) => (b.onclick = () => select(rows.find((r) => r.des === b.dataset.des && r.time === b.dataset.time)!)));
  // 選んでいるカードが見える位置まで、横に送る
  $("strip").querySelector<HTMLElement>(".card.on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** 3D は推定の最大の大きさで描く */
function sliderMeters() {
  return selected!.facts.size.max;
}

function select(r: Row) {
  selected = r;
  renderStrip();
  $("stage").hidden = false;
  const f = r.facts;
  $("name").textContent = name(r);
  $("headline").textContent = "";

  // 比べる物：3D で並べられる物のうち、大きさがいちばん近いもの
  const mid = Math.sqrt(f.size.min * f.size.max);
  // URL の &cmp=Q243 で、比べる物を選んだ状態にできる（共有用）
  const want = initial.cmp;
  initial.cmp = null;
  compare = f.modelComparisons.find((c) => c.qid === want) ?? [...f.modelComparisons].sort((a, b) => Math.abs(Math.log(a.value / mid)) - Math.abs(Math.log(b.value / mid)))[0] ?? null;
  renderChips();

  updateScene();

  $("ai-body").innerHTML = `<p class="muted">${t.aiLoading}</p>`;
  history.replaceState(null, "", `?${new URLSearchParams({ ...(new URLSearchParams(location.search).get("lang") ? { lang } : {}), des: r.des })}`);
  loadExplanation(r);
}


function renderChips() {
  const f = selected!.facts;
  $("chips").innerHTML = f.modelComparisons
    .map((c) => `<button data-q="${c.qid}" aria-pressed="${c.qid === compare?.qid}">${esc(c.name[lang])}<small>${fmtM(c.value)} m</small></button>`)
    .join("");
  $("chips")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          compare = f.modelComparisons.find((c) => c.qid === b.dataset.q) ?? null;
          renderChips();
          updateScene();
        }),
    );
}

async function updateScene() {
  if (!scene || !selected) return;
  const f = selected.facts;
  await scene.set(
    {
      asteroid: { name: name(selected), min: f.size.min, max: f.size.max },
      compare: compare ? { qid: compare.qid, name: compare.name[lang], sub: `${compare.what[lang]} ${fmtM(compare.value)} m`, value: compare.value } : null,
      person: { name: t.person, sub: t.personSub },
    },
    sliderMeters(),
  );
  // URL の &view=human で、人の目線から始める（共有用）
  // 比べる物が小惑星よりずっと小さいときは、比べる物に寄った視点から始める
  setView(initial.view === "human" ? "human" : (scene.suggestedView() as View));
  initial.view = null;
}

type View = "overview" | "human" | "object";
function setView(v: View) {
  scene?.view(v);
  $("v-over").setAttribute("aria-pressed", String(v === "overview"));
  $("v-obj").setAttribute("aria-pressed", String(v === "object"));
  $("v-human").setAttribute("aria-pressed", String(v === "human"));
}
$("v-obj").onclick = () => setView("object");
$("v-over").onclick = () => setView("overview");
$("v-human").onclick = () => setView("human");

async function loadExplanation(r: Row) {
  try {
    const res = await fetch(`/api/explain?${new URLSearchParams({ des: r.des, time: r.time, lang })}`);
    const j = await res.json();
    if (selected !== r) return; // ほかの小惑星を選んだあとなら捨てる
    if (!res.ok) throw new Error(j.error);
    const e = j.explanation as { headline: string; size: string; distance: string; speed: string; calm: string };
    $("headline").textContent = e.headline;
    $("ai-body").innerHTML = `<p>${esc(e.size)}</p><p>${esc(e.distance)}</p><p>${esc(e.speed)}</p><p class="calm">${esc(e.calm)}</p>
      <p class="small">${j.check.unmatchedNumbers.length ? `<span class="warn">${esc(t.aiUnmatched(j.check.unmatchedNumbers.join(", ")))}</span>` : `<span class="ok">${t.aiAllMatched}</span>`}<br><span class="muted">${t.aiNote}</span></p>
      <p class="muted small">${t.colTime}${t.colon}${dateFmt.format(new Date(r.time))}${r.timeSigma ? esc(t.paren(t.timeSigma(r.timeSigma))) : ""}</p>`;
  } catch (err) {
    if (selected === r) $("ai-body").innerHTML = `<p class="warn">${esc((err as Error).message || t.error)}</p>`;
  }
}
