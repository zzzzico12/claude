import { mountAttribution } from "@advent/attribution";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { recommend, REQUIREMENTS, type Candidate, type Query, type Requirement } from "../lib/recommend.js";
import { COUNTRY_JA, PROVIDER_LABEL, REGIONS, type Provider } from "../lib/regions.js";
import { sources } from "../lib/sources.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const PLACES = [
  { name: "東京", lat: 35.68, lon: 139.69 },
  { name: "大阪", lat: 34.69, lon: 135.5 },
  { name: "福岡", lat: 33.59, lon: 130.4 },
  { name: "ソウル", lat: 37.57, lon: 126.98 },
  { name: "シンガポール", lat: 1.35, lon: 103.82 },
  { name: "ロンドン", lat: 51.51, lon: -0.13 },
  { name: "ニューヨーク", lat: 40.71, lon: -74.0 },
  { name: "サンフランシスコ", lat: 37.77, lon: -122.42 },
  { name: "サンパウロ", lat: -23.55, lon: -46.63 },
];

// CO2 の色（少ない＝濃い緑 → 多い＝赤）。凡例と地図の両方で使う
const BANDS = [
  { max: 100, color: "#1a7f4b", label: "100 未満（水力・原子力・再エネが中心）" },
  { max: 250, color: "#7cb342", label: "100〜250" },
  { max: 400, color: "#f2c037", label: "250〜400" },
  { max: 550, color: "#ef8a3a", label: "400〜550" },
  { max: Infinity, color: "#d64541", label: "550 以上（石炭・ガスが中心）" },
];
const colorOf = (g: number) => BANDS.find((b) => g < b.max)!.color;

const state: Query & { placeName: string } = {
  placeName: "東京",
  lat: 35.68,
  lon: 139.69,
  requirement: "web",
  providers: ["gcp", "aws", "azure"],
  countries: null,
};

// ---------- 入力 ----------
const places = $("places");
for (const p of PLACES) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = p.name;
  b.addEventListener("click", () => setPlace(p.name, p.lat, p.lon));
  places.append(b);
}
$("geo").addEventListener("click", () => {
  navigator.geolocation?.getCurrentPosition(
    (pos) => setPlace("現在地", pos.coords.latitude, pos.coords.longitude),
    () => alert("現在地を取得できませんでした"),
  );
});

$("requirements").innerHTML = (Object.keys(REQUIREMENTS) as Requirement[])
  .map((k) => {
    const r = REQUIREMENTS[k];
    const limit = r.maxRttMs ? `遅延 ${r.maxRttMs}ms 以内` : "遅延の条件なし";
    return `<label><input type="radio" name="req" value="${k}" ${k === state.requirement ? "checked" : ""}> ${esc(r.label)}<small>${limit}</small></label>`;
  })
  .join("");
$("requirements").addEventListener("change", (e) => {
  state.requirement = (e.target as HTMLInputElement).value as Requirement;
  update();
});

$("providers").innerHTML = (Object.keys(PROVIDER_LABEL) as Provider[])
  .map((p) => `<label><input type="checkbox" value="${p}" checked> ${PROVIDER_LABEL[p]}</label>`)
  .join("");
$("providers").addEventListener("change", () => {
  state.providers = [...$("providers").querySelectorAll<HTMLInputElement>("input:checked")].map((i) => i.value as Provider);
  update();
});

const countrySel = $<HTMLSelectElement>("country");
const countries = [...new Set(REGIONS.filter((r) => r.public !== false).map((r) => r.iso3))].sort((a, b) =>
  (COUNTRY_JA[a] ?? a).localeCompare(COUNTRY_JA[b] ?? b, "ja"),
);
countrySel.innerHTML =
  `<option value="">どこでもよい</option>` +
  countries.map((c) => `<option value="${c}">${esc(COUNTRY_JA[c] ?? c)} のみ</option>`).join("");
countrySel.addEventListener("change", () => {
  state.countries = countrySel.value ? [countrySel.value] : null;
  update();
});

$("legend").innerHTML = BANDS.map((b) => `<li><span class="swatch" style="background:${b.color}"></span>${b.label}</li>`).join("");

// ---------- 地図 ----------
const map = L.map("map", { worldCopyJump: true, minZoom: 1 }).setView([30, 140], 2);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 8,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
const layer = L.layerGroup().addTo(map);
map.on("click", (e: L.LeafletMouseEvent) => setPlace("地図で選んだ場所", e.latlng.lat, ((e.latlng.lng + 540) % 360) - 180));

function setPlace(name: string, lat: number, lon: number) {
  Object.assign(state, { placeName: name, lat, lon });
  for (const b of places.querySelectorAll("button")) b.classList.toggle("active", b.textContent === name);
  update();
}

// ---------- 結果 ----------
const pct = (x: number) => `${Math.round(x * 100)}%`;
const label = (c: Candidate) => `${PROVIDER_LABEL[c.region.provider]} ${c.region.id}`;

function update() {
  aiBody.innerHTML = `<p class="muted">提案の理由と注意点を、AI（Claude）が説明します。</p>`;
  aiBtn.disabled = false;
  const rec = recommend(state);
  const best = rec.ranked[0];

  // 見出し
  const head = $("headline");
  if (!best || !rec.nearest) {
    head.innerHTML = `<p>条件を満たすリージョンがありません。要件をゆるめるか、置ける国を「どこでもよい」にしてください。</p>`;
  } else if (best === rec.nearest || !rec.savings || rec.savings.ratio < 0.005) {
    head.innerHTML = `<p><b>${esc(state.placeName)}</b>からは、いちばん近い <b>${esc(label(best))}</b>（${esc(best.region.city)}）が、条件の中で CO2 も最も少ないリージョンです。</p>`;
  } else {
    head.innerHTML = `<p><b>${esc(state.placeName)}</b>から最寄りの ${esc(label(rec.nearest))}（${esc(rec.nearest.region.city)}、${rec.nearest.carbon.g} g）の代わりに
      <b>${esc(label(best))}</b>（${esc(best.region.city)}、${best.carbon.g} g）を使うと、電力の CO2 を <b class="big">${pct(rec.savings.ratio)} 減らせます</b>。
      遅延の目安は ${rec.nearest.rttMs}ms → ${best.rttMs}ms（${rec.savings.extraMs >= 0 ? "+" : ""}${rec.savings.extraMs}ms）。</p>`;
  }
  const ex = rec.excluded;
  if (ex.latency) head.innerHTML += `<p class="muted">遅延の条件で ${ex.latency} 件を除外しました。</p>`;

  // 表
  $("table").querySelector("tbody")!.innerHTML = rec.ranked
    .slice(0, 30)
    .map((c, i) => {
      const off = c.carbon.official ? `${c.carbon.official.g}（${c.carbon.official.year}）` : "—";
      const basis = `${c.carbon.year}年・${c.carbon.basis === "state" ? "州" : "国"}`;
      const isNearest = c === rec.nearest;
      return `<tr class="${isNearest ? "nearest" : ""}">
        <td class="num">${i + 1}</td>
        <td><span class="prov ${c.region.provider}">${PROVIDER_LABEL[c.region.provider]}</span> ${esc(c.region.id)}${isNearest ? ' <span class="tag">最寄り</span>' : ""}</td>
        <td>${esc(c.region.city)}<div class="meta">${esc(COUNTRY_JA[c.region.iso3] ?? c.region.iso3)}</div></td>
        <td class="num"><span class="swatch" style="background:${colorOf(c.carbon.g)}"></span>${c.carbon.g}<div class="meta">${basis}</div></td>
        <td class="num">${off}</td>
        <td class="num">${c.rttMs} ms</td>
      </tr>`;
    })
    .join("");

  // 地図
  layer.clearLayers();
  const okIds = new Set(rec.ranked.map((c) => `${c.region.provider}:${c.region.id}`));
  const seen = new Set<string>();
  for (const r of REGIONS.filter((r) => r.public !== false && state.providers.includes(r.provider))) {
    const c = rec.ranked.find((x) => x.region === r);
    const key = `${r.lat},${r.lon}`;
    const ok = okIds.has(`${r.provider}:${r.id}`);
    const g = c?.carbon.g;
    if (seen.has(key) && !ok) continue;
    seen.add(key);
    L.circleMarker([r.lat, r.lon], {
      radius: ok ? 7 : 4,
      color: "#fff",
      weight: 1,
      fillColor: g !== undefined ? colorOf(g) : "#999",
      fillOpacity: ok ? 0.95 : 0.35,
    })
      .bindTooltip(`${PROVIDER_LABEL[r.provider]} ${r.id}<br>${esc(r.city)}${g !== undefined ? `<br>${g} gCO2/kWh・${c!.rttMs}ms` : ""}`)
      .addTo(layer);
  }
  L.circleMarker([state.lat, state.lon], { radius: 8, color: "#1f5fbf", weight: 3, fillColor: "#fff", fillOpacity: 1 })
    .bindTooltip(esc(state.placeName))
    .addTo(layer);
  if (best) {
    L.polyline(
      [
        [state.lat, state.lon],
        [best.region.lat, best.region.lon],
      ],
      { color: "#1a7f4b", weight: 3, dashArray: "6 6" },
    ).addTo(layer);
    L.circleMarker([best.region.lat, best.region.lon], { radius: 12, color: "#1a7f4b", weight: 3, fill: false }).addTo(layer);
  }
}

// ---------- AI の説明 ----------
const aiBody = $("ai-body");
const aiBtn = $<HTMLButtonElement>("ai-btn");
aiBtn.addEventListener("click", async () => {
  aiBtn.disabled = true;
  aiBody.innerHTML = `<p class="muted">AI が説明を書いています…</p>`;
  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    if (!data.text) {
      aiBody.innerHTML = `<p class="muted">説明する提案がありません。</p>`;
      return;
    }
    const check = data.unmatchedNumbers?.length
      ? `<p class="check warn">⚠ 根拠のデータにない数字があります：${data.unmatchedNumbers.map(esc).join("、")}</p>`
      : `<p class="check ok">✓ 説明の数字は、すべて表の値と一致</p>`;
    aiBody.innerHTML = data.text
      .split(/\n+/)
      .filter(Boolean)
      .map((p: string) => `<p>${esc(p)}</p>`)
      .join("") + check;
  } catch (err) {
    aiBody.innerHTML = `<p class="check warn">${esc((err as Error).message)}</p>`;
    aiBtn.disabled = false;
  }
});

mountAttribution($("attribution"), sources);
setPlace(state.placeName, state.lat, state.lon);
