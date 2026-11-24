import "./style.css";
import { mountAttribution } from "@advent/attribution";
import { sources, sourcesEn } from "../lib/sources.js";
import type { PassOut, Prediction } from "../lib/predict.js";
import { applyStatic, lang, switchLang, t } from "./i18n.js";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const en = lang === "en";

type Result = Prediction & { location: Prediction["location"] & { name: string | null } };

applyStatic();
$("lang").onclick = () => switchLang(en ? "ja" : "en");
mountAttribution($("attribution"), en ? sourcesEn : sources, { lang });
if (en) $<HTMLInputElement>("place").value = "Tokyo";
renderDocs();

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
    const r = await fetch(url);
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
  const tz = res.location.timezone || "UTC";
  const dateFmt = new Intl.DateTimeFormat(en ? "en-US" : "ja-JP", { timeZone: tz, month: en ? "short" : "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const timeFmt = new Intl.DateTimeFormat(en ? "en-US" : "ja-JP", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const placeName = res.location.name ?? `${res.location.lat}, ${res.location.lon}`;
  $("result-title").textContent = t.resultTitle(placeName, res.satellite.name);
  $("result-note").textContent = t.timeNote(tz);
  const link = $<HTMLAnchorElement>("json-link");
  link.hidden = !url;
  if (url) link.href = url;

  const tbody = $("passes").querySelector("tbody")!;
  if (!res.passes.length) {
    tbody.innerHTML = `<tr><td colspan="6">${t.noPass}</td></tr>`;
    $("sky").hidden = true;
  } else {
    tbody.innerHTML = res.passes
      .map(
        (p, i) => `<tr data-i="${i}" class="${p.rank === 1 ? "best" : ""}" tabindex="0">
          <td class="r"><span class="rank">${p.rank}</span> <span class="muted small">${p.score}</span></td>
          <td>${dateFmt.format(new Date(p.start.time))}<br><span class="muted small">${t.dir(p.start.direction)}・${t.elev(p.start.elevation)}</span></td>
          <td>${timeFmt.format(new Date(p.max.time))}<br><span class="muted small">${t.dir(p.max.direction)}・${t.elev(p.max.elevation)}</span></td>
          <td>${timeFmt.format(new Date(p.end.time))}<br><span class="muted small">${t.dir(p.end.direction)}・${t.endsBy[p.endsBy] ?? ""}</span></td>
          <td class="r">${t.minutes((p.durationSec / 60).toFixed(1))}</td>
          <td class="r">${p.cloudCover == null ? `<span class="muted">${t.noForecast}</span>` : `${p.cloudCover}%`}</td>
        </tr>`,
      )
      .join("");
    const best = res.passes.find((p) => p.rank === 1)!;
    drawSky(best);
  }
  $("result").hidden = false;
}

$("passes").addEventListener("click", (e) => {
  const tr = (e.target as HTMLElement).closest("tr[data-i]") as HTMLElement | null;
  if (tr && last) drawSky(last.passes[Number(tr.dataset.i)]);
});
$("passes").addEventListener("keydown", (e) => {
  const tr = (e.target as HTMLElement).closest("tr[data-i]") as HTMLElement | null;
  if (tr && last && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    drawSky(last.passes[Number(tr.dataset.i)]);
  }
});

// ---------- 空の通り道（真上から見た図。上が北） ----------
const R = 115;
function xy(az: number, el: number): [number, number] {
  const r = ((90 - Math.max(0, el)) / 90) * R;
  const a = (az * Math.PI) / 180;
  // 空を見上げた図なので、東は左（地図と逆）
  return [-r * Math.sin(a), -r * Math.cos(a)];
}

function drawSky(p: PassOut) {
  $("passes").querySelectorAll("tr[data-i]").forEach((tr) => tr.classList.toggle("on", last?.passes[Number((tr as HTMLElement).dataset.i)] === p));
  const [sx, sy] = xy(p.start.azimuth, p.start.elevation);
  const [mx, my] = xy(p.max.azimuth, p.max.elevation);
  const [ex, ey] = xy(p.end.azimuth, p.end.elevation);
  // 3点を通る2次曲線（中間で max を通るように制御点を置く）
  const cx = 2 * mx - (sx + ex) / 2;
  const cy = 2 * my - (sy + ey) / 2;
  const labels = en ? ["N", "E", "S", "W"] : ["北", "東", "南", "西"];
  $("sky-svg").innerHTML = `
    <circle r="${R}" class="sky-bg" />
    <circle r="${(60 / 90) * R}" class="sky-ring" /><circle r="${(30 / 90) * R}" class="sky-ring" />
    <circle r="${(80 / 90) * R}" class="sky-limit" />
    <line x1="0" y1="${-R}" x2="0" y2="${R}" class="sky-ring" /><line x1="${-R}" y1="0" x2="${R}" y2="0" class="sky-ring" />
    <text x="0" y="${-R - 4}" class="sky-label" text-anchor="middle">${labels[0]}</text>
    <text x="${-R - 4}" y="4" class="sky-label" text-anchor="end">${labels[1]}</text>
    <text x="0" y="${R + 13}" class="sky-label" text-anchor="middle">${labels[2]}</text>
    <text x="${R + 4}" y="4" class="sky-label" text-anchor="start">${labels[3]}</text>
    <text x="3" y="${-(60 / 90) * R + 10}" class="sky-tick">30°</text><text x="3" y="${-(30 / 90) * R + 10}" class="sky-tick">60°</text>
    <path d="M${sx},${sy} Q${cx},${cy} ${ex},${ey}" class="sky-path" />
    <circle cx="${sx}" cy="${sy}" r="5" class="sky-mark" />
    <rect x="${mx - 5}" y="${my - 5}" width="10" height="10" transform="rotate(45 ${mx} ${my})" class="sky-mark" />
    <rect x="${ex - 4.5}" y="${ey - 4.5}" width="9" height="9" class="sky-mark" />`;
  $("sky-svg").setAttribute(
    "aria-label",
    `${t.dir(p.start.direction)} → ${t.dir(p.max.direction)} ${t.elev(p.max.elevation)} → ${t.dir(p.end.direction)}`,
  );
  $("sky-title").textContent = t.skyTitle(p.rank);
  $("sky").hidden = false;
}

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
    renderResult(p, null);
  } catch (err) {
    box.textContent = (err as Error).message;
  } finally {
    btn.disabled = false;
  }
};

// ---------- API の説明 ----------
function renderDocs() {
  const o = location.origin;
  const rows = en
    ? [
        ["lat, lon", "Latitude and longitude (degrees). Or use place"],
        ["place", "Place name (e.g. Tokyo, 札幌市). Looked up with Open-Meteo"],
        ["sat", "NORAD ID or name (ISS, Tiangong, Hubble …). Default: ISS. List: /api/sats"],
        ["days", "1–7. Default: 7"],
        ["lang", "ja or en (place-name language)"],
      ]
    : [
        ["lat, lon", "緯度・経度（度）。place の代わり"],
        ["place", "地名（例：札幌市、東京都、Tokyo）。Open-Meteo で緯度経度にする"],
        ["sat", "NORAD 番号か名前（ISS・天宮・ハッブルなど）。既定は ISS。一覧は /api/sats"],
        ["days", "1〜7。既定は 7"],
        ["lang", "ja か en（地名の言語）"],
      ];
  $("docs").innerHTML = `
    <h3>GET /api/passes</h3>
    <p>${en ? "Visible passes with times (UTC and local), directions, elevations, cloud cover and score." : "見える通過の、時刻（UTC と観測地の時刻）・方角・高さ・雲量・見やすさの点数を返します。"}</p>
    <table class="params"><tbody>${rows.map(([k, v]) => `<tr><th><code>${k}</code></th><td>${escapeHtml(v)}</td></tr>`).join("")}</tbody></table>
    <pre><code>curl "${o}/api/passes?place=${en ? "Tokyo" : "%E6%9C%AD%E5%B9%8C%E5%B8%82"}&amp;days=3"
curl "${o}/api/passes?lat=35.68&amp;lon=139.69&amp;sat=48274"</code></pre>
    <h3>POST /api/ask</h3>
    <p>${en ? "Answers a question in natural language. AI reads the place, days and satellite from the question; code computes and ranks the passes. Limited to 10 per day in total." : "質問に自然文で答えます。AI が質問から場所・日数・衛星を読み取り、通過の計算と順位付けはコードが行います。全体で1日10回まで。"}</p>
    <pre><code>curl -X POST ${o}/api/ask -H "Content-Type: application/json" \\
  -d '{"question": "${en ? "Best ISS pass in London this week?" : "札幌で今週いちばん見やすいのは？"}", "lang": "${lang}"}'</code></pre>
    <h3>GET /api/sats</h3>
    <p>${en ? "Satellites you can predict (CelesTrak stations and visual groups)." : "予測できる衛星の一覧（CelesTrak の stations と visual）。"}</p>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// 開いたらすぐ、既定の場所で調べる
$<HTMLFormElement>("form").requestSubmit();
