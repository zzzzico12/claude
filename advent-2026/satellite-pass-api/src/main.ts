import "./style.css";
import { mountAttribution } from "@advent/attribution";
import { sources, sourcesEn } from "../lib/sources.js";
import type { PassOut, Prediction } from "../lib/predict.js";
import { Dome, fallbackPath, type DomeState } from "./dome.js";
import { applyStatic, lang, switchLang, t } from "./i18n.js";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const en = lang === "en";

type Result = Prediction & { location: Prediction["location"] & { name: string | null } };

applyStatic();
$("lang").onclick = () => switchLang(en ? "ja" : "en");
mountAttribution($("attribution"), en ? sourcesEn : sources, { lang });
if (en) $<HTMLInputElement>("place").value = "Tokyo";

// ---------- この画面について（出典・条件・点数） ----------
const about = $<HTMLDialogElement>("about");
$("about-open").onclick = $("about-open2").onclick = () => about.showModal();
about.addEventListener("click", (e) => {
  if (e.target === about) about.close(); // 外側を押したら閉じる
});

// ---------- タブ ----------
const tabs = [$("tab-search"), $("tab-ask")];
function selectTab(i: number) {
  tabs.forEach((tab, j) => {
    tab.setAttribute("aria-selected", String(i === j));
    tab.tabIndex = i === j ? 0 : -1;
    $(tab.getAttribute("aria-controls")!).hidden = i !== j;
  });
}
tabs.forEach((tab, i) => {
  tab.onclick = () => selectTab(i);
  tab.onkeydown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const j = (i + 1) % 2;
      selectTab(j);
      tabs[j].focus();
    }
  };
});

// ---------- 空のドーム ----------
let tz = "UTC";
const clock = () => new Intl.DateTimeFormat(en ? "en-GB" : "ja-JP", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
const clockSec = () => new Intl.DateTimeFormat(en ? "en-GB" : "ja-JP", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const dayFmt = () => new Intl.DateTimeFormat(en ? "en-US" : "ja-JP", { timeZone: tz, month: en ? "short" : "numeric", day: "numeric", weekday: "short" });

// 時刻の書式は作るのが重いので、場所（時間帯）が変わったときだけ作り直す
let secFmt = clockSec();
let dome: Dome | null = null;
try {
  dome = new Dome($("dome"), { compass: t.compass, ring: t.ring });
} catch {
  // WebGL が使えない環境では、表だけ使える
  $("dome").textContent = en ? "3D view is not available in this browser." : "このブラウザでは3D表示が使えません。";
}
let shown: PassOut | null = null;
const scrub = $<HTMLInputElement>("scrub");
if (dome) {
  dome.onChange = (s: DomeState) => {
    if (!shown) return;
    scrub.min = String(s.span[0]);
    scrub.max = String(s.span[1]);
    if (document.activeElement !== scrub) scrub.value = String(Math.round(s.sec));
    const time = secFmt.format(new Date(Date.parse(shown.start.time) + s.sec * 1000));
    $("now").textContent = t.nowText(time, t.dir(direction16(s.azimuth)), Math.round(s.elevation), s.visible ? t.visibleNow : t.hiddenNow(s.elevation));
    $("now").classList.toggle("on", s.visible);
    const play = $("play");
    play.textContent = s.playing ? "❚❚" : "▶";
    play.setAttribute("aria-label", s.playing ? t.pause : t.play);
  };
  $("play").onclick = () => dome!.togglePlaying();
  scrub.oninput = () => {
    dome!.setPlaying(false);
    dome!.seek(Number(scrub.value));
  };
  const views = { outside: $("view-outside"), inside: $("view-inside") };
  for (const [k, btn] of Object.entries(views)) {
    btn.onclick = () => {
      dome!.setView(k as "outside" | "inside");
      for (const b of Object.values(views)) b.setAttribute("aria-pressed", String(b === btn));
    };
  }
  // ?view=inside で、見上げる視点から始める
  if (new URLSearchParams(location.search).get("view") === "inside") views.inside.click();
}

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const direction16 = (az: number) => DIRS[Math.round((((az % 360) + 360) % 360) / 22.5) % 16];

function showPass(p: PassOut | null) {
  shown = p;
  $("passes").querySelectorAll("tr[data-i]").forEach((tr) => tr.classList.toggle("on", !!p && last?.passes[Number((tr as HTMLElement).dataset.i)] === p));
  $("sky-empty").hidden = !!p;
  $("sky-empty").textContent = t.skyEmpty;
  if (!p) {
    $("sky-title").textContent = "";
    $("sky-sub").textContent = "";
    $("now").textContent = "";
    dome?.setPass({ path: [], marks: [] });
    return;
  }
  $("sky-title").textContent = t.skyTitle(p.rank, dayFmt().format(new Date(p.start.time)));
  $("sky-sub").textContent = t.skySub;
  const sec = (x: PassOut["start"]) => (Date.parse(x.time) - Date.parse(p.start.time)) / 1000;
  const c = clock();
  const marks = [
    { sec: 0, azimuth: p.start.azimuth, elevation: p.start.elevation, label: t.markStart(c.format(new Date(p.start.time))) },
    { sec: sec(p.max), azimuth: p.max.azimuth, elevation: p.max.elevation, label: t.markMax(c.format(new Date(p.max.time)), p.max.elevation) },
    { sec: sec(p.end), azimuth: p.end.azimuth, elevation: p.end.elevation, label: t.markEnd(c.format(new Date(p.end.time)), t.endsByShort[p.endsBy] ?? "") },
  ];
  const path =
    p.path ??
    fallbackPath([0, p.start.azimuth, p.start.elevation], [sec(p.max), p.max.azimuth, p.max.elevation], [sec(p.end), p.end.azimuth, p.end.elevation]);
  dome?.setPass({ path, marks });
}

// ---------- 衛星の一覧 ----------
fetch("/api/sats")
  .then((r) => r.json())
  .then((j: { satellites: { norad: number; name: string; ja?: string; en?: string }[] }) => {
    const famous = j.satellites.filter((s) => s.ja);
    const rest = j.satellites.filter((s) => !s.ja);
    $("sat").innerHTML =
      famous.map((s) => `<option value="${s.norad}">${escapeHtml((en ? s.en : s.ja) ?? s.name)}</option>`).join("") +
      `<optgroup label="${en ? "Other bright satellites" : "その他の明るい衛星"}">` +
      rest.map((s) => `<option value="${s.norad}">${escapeHtml(s.name)}</option>`).join("") +
      `</optgroup>`;
  })
  .catch(() => {
    $("sat").innerHTML = `<option value="25544">ISS</option>`;
  });

// ---------- 場所（現在地） ----------
let here: { lat: number; lon: number } | null = null;
$<HTMLInputElement>("place").addEventListener("input", () => (here = null));
$("here").onclick = () => {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // 送るのは小数2桁（約1km）まで。予測には十分
      here = { lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100 };
      $<HTMLInputElement>("place").value = `${t.hereLabel} (${here.lat}, ${here.lon})`;
    },
    () => showError(t.geoFailed),
  );
};

function locationParams(): URLSearchParams {
  const p = new URLSearchParams();
  if (here) {
    p.set("lat", String(here.lat));
    p.set("lon", String(here.lon));
  } else p.set("place", $<HTMLInputElement>("place").value.trim());
  return p;
}

// ---------- 通過を調べる ----------
let last: Result | null = null;

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $<HTMLButtonElement>("search");
  btn.disabled = true;
  btn.textContent = t.searching;
  $("error").hidden = true;
  try {
    const p = locationParams();
    p.set("sat", $<HTMLSelectElement>("sat").value || "25544");
    p.set("days", $<HTMLSelectElement>("days").value);
    if (en) p.set("lang", "en");
    const url = `/api/passes?${p}`;
    const r = await fetch(`${url}&path=1`);
    const j = await r.json();
    if (!r.ok) throw new Error(t.apiError(r.status, j.error));
    renderResult(j, url);
  } catch (err) {
    showError((err as Error).message);
  } finally {
    btn.disabled = false;
    btn.textContent = t.search;
  }
});

function showError(msg: string) {
  $("error").textContent = msg;
  $("error").hidden = false;
}

function renderResult(res: Result, url: string | null) {
  last = res;
  tz = res.location.timezone || "UTC";
  secFmt = clockSec();
  const dateFmt = new Intl.DateTimeFormat(en ? "en-US" : "ja-JP", { timeZone: tz, month: en ? "short" : "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const timeFmt = clock();
  const placeName = res.location.name ?? `${res.location.lat}, ${res.location.lon}`;
  $("result-title").textContent = t.resultTitle(placeName, res.satellite.name);
  $("result-note").textContent = t.timeNote(tz);
  const link = $<HTMLAnchorElement>("json-link");
  link.hidden = !url;
  if (url) link.href = url;

  const tbody = $("passes").querySelector("tbody")!;
  if (!res.passes.length) {
    tbody.innerHTML = `<tr><td colspan="6">${t.noPass}</td></tr>`;
    showPass(null);
  } else {
    tbody.innerHTML = res.passes
      .map(
        (p, i) => `<tr data-i="${i}" class="${p.rank === 1 ? "best" : ""}" tabindex="0">
          <td><span class="rank">${t.rank(p.rank)}</span><br><span class="score"><i style="width:${p.score}%"></i></span><span class="muted small">${t.points(p.score)}</span></td>
          <td>${dateFmt.format(new Date(p.start.time))}<br><span class="muted small">${t.dir(p.start.direction)}</span></td>
          <td>${timeFmt.format(new Date(p.max.time))}<br><span class="muted small">${t.dir(p.max.direction)}・${p.max.elevation}°</span></td>
          <td>${timeFmt.format(new Date(p.end.time))}<br><span class="muted small">${t.dir(p.end.direction)}・${t.endsByShort[p.endsBy] ?? ""}</span></td>
          <td class="r">${t.minutes((p.durationSec / 60).toFixed(1))}</td>
          <td class="r">${p.cloudCover == null ? `<span class="muted small">${t.noForecast}</span>` : `${p.cloudCover}%`}</td>
        </tr>`,
      )
      .join("");
    showPass(res.passes.find((p) => p.rank === 1)!);
  }
  $("result").hidden = false;
}

$("passes").addEventListener("click", (e) => {
  const tr = (e.target as HTMLElement).closest("tr[data-i]") as HTMLElement | null;
  if (tr && last) showPass(last.passes[Number(tr.dataset.i)]);
});
$("passes").addEventListener("keydown", (e) => {
  const tr = (e.target as HTMLElement).closest("tr[data-i]") as HTMLElement | null;
  if (tr && last && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    showPass(last.passes[Number(tr.dataset.i)]);
  }
});

// ---------- AI に質問する ----------
$("ask").onclick = async () => {
  const question = $<HTMLTextAreaElement>("question").value.trim();
  if (!question) return;
  const btn = $<HTMLButtonElement>("ask");
  const box = $("answer");
  btn.disabled = true;
  box.hidden = false;
  box.textContent = t.asking;
  try {
    // 地名のない質問のために、画面で選んだ場所（現在地か、最後に調べた場所）も送る
    const loc = here ?? (last ? { lat: last.location.lat, lon: last.location.lon } : null);
    const r = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, lang, ...(loc ?? {}) }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(t.apiError(r.status, j.error));
    const u = j.understood;
    const p: Result = j.prediction;
    box.innerHTML =
      j.answer
        .split(/\n+/)
        .map((x: string) => `<p>${escapeHtml(x)}</p>`)
        .join("") +
      (j.unmatchedNumbers?.length ? `<p class="warn">${escapeHtml(t.unmatched(j.unmatchedNumbers.join(", ")))}</p>` : `<p class="ok">${t.allMatched}</p>`) +
      `<p class="muted small">${escapeHtml(t.understood(p.location.name ?? `${p.location.lat}, ${p.location.lon}`, u.days, p.satellite.name))}</p>` +
      `<p class="muted small">${t.aiNote(Boolean(j.cached))}</p>`;
    // 表（「通過を調べる」タブ）と空のドームも、この答えの一覧にする
    renderResult(p, null);
  } catch (err) {
    box.textContent = (err as Error).message;
  } finally {
    btn.disabled = false;
  }
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// 開いたらすぐ、既定の場所で調べる
$<HTMLFormElement>("form").requestSubmit();
