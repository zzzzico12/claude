import { mountAttribution } from "@advent/attribution";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { sources } from "../lib/sources.js";

interface Patch {
  id: number;
  area_ha: number;
  lat: number;
  lon: number;
  ndvi_before: number;
  ndvi_after: number;
  ndvi_drop: number;
  context?: { road_m: number | null; road_type: string | null; road_name: string | null; river_m: number | null };
}
interface Result {
  area: string;
  bounds: { west: number; south: number; east: number; north: number };
  pixel_m: number;
  before: { date: string; id: string; clear: number };
  after: { date: string; id: string; clear: number };
  rules: { forest_ndvi: number; forest_method: string; drop_ndvi: number; year_shift: number; min_area_ha: number };
  total_change_ha: number;
  patch_count: number;
  forest_before_ha: number;
  patches: Patch[];
}
interface Explanation {
  summary: string;
  candidates: { cause: string; likelihood: string; evidence: string }[];
  unmatchedNumbers: string[];
}
interface Evaluation {
  truth_ha: number;
  precision: number;
  recall: number;
  f1: number;
  baseline: { precision: number; recall: number; f1: number };
  fp_lost_2024: number;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const ha = (x: number) => `${x.toLocaleString("ja-JP", { maximumFractionDigits: 1 })} ha`;

async function main() {
  const [r, ex, ev] = await Promise.all([
    fetch("/data/result.json").then((x) => x.json() as Promise<Result>),
    fetch("/data/explanations.json").then((x) => x.json() as Promise<Record<string, Explanation>>),
    fetch("/data/eval.json").then((x) => x.json() as Promise<Evaluation>),
  ]);

  $("lead").textContent = `${r.area}の約20km四方で、${r.before.date} と ${r.after.date} の衛星画像（Sentinel-2）を比べ、植物の量（NDVI）が大きく下がった森を見つけました。`;
  $("label-before").textContent = r.before.date;
  $("label-after").textContent = r.after.date;
  $("stats").innerHTML = `
    <div><b>${ha(r.total_change_ha)}</b><span>森が減ったと検知した面積</span></div>
    <div><b>${r.patch_count} か所</b><span>まとまりの数（${r.rules.min_area_ha} ha 以上）</span></div>
    <div><b>${ha(r.forest_before_ha)}</b><span>前の年に森だった面積</span></div>
    <div><b>${pct(ev.precision)}</b><span>検知のうち、森林減少データ（Hansen）でも2025年に減少していた割合</span></div>`;

  // ---------- 地図 ----------
  const b = r.bounds;
  const bounds = L.latLngBounds([b.south, b.west], [b.north, b.east]);
  const map = L.map("map", { maxBounds: bounds.pad(0.5) }).fitBounds(bounds);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Contains modified Copernicus Sentinel data [2024, 2025]',
  }).addTo(map);
  const before = L.imageOverlay("/data/before.jpg", bounds).addTo(map);
  const after = L.imageOverlay("/data/after.jpg", bounds, { opacity: 1 }).addTo(map);
  const change = L.imageOverlay("/data/change.png", bounds).addTo(map);
  void before;
  $<HTMLInputElement>("fade").addEventListener("input", (e) => after.setOpacity(Number((e.target as HTMLInputElement).value) / 100));
  $<HTMLInputElement>("show-change").addEventListener("change", (e) =>
    (e.target as HTMLInputElement).checked ? change.addTo(map) : change.remove(),
  );

  const markers = new Map<number, L.CircleMarker>();
  for (const p of r.patches) {
    const m = L.circleMarker([p.lat, p.lon], {
      radius: Math.max(4, Math.sqrt(p.area_ha) * 1.6),
      color: "#fff",
      weight: 1.5,
      fillColor: ex[p.id] ? "#f2c037" : "#e64545",
      fillOpacity: 0.55,
    })
      .bindTooltip(`#${p.id}　${ha(p.area_ha)}`)
      .on("click", () => show(p))
      .addTo(map);
    markers.set(p.id, m);
  }

  // ---------- 説明 ----------
  function show(p: Patch) {
    const e = ex[p.id];
    const ctx = p.context;
    const road = ctx?.road_m != null ? `${(ctx.road_m / 1000).toFixed(1)} km（${esc(ctx.road_type ?? "")}${ctx.road_name ? `「${esc(ctx.road_name)}」` : ""}）` : "—";
    $("detail").innerHTML = `
      <h2>#${p.id}　${ha(p.area_ha)}</h2>
      <div class="pair">
        <figure><img src="/data/crops/${p.id}-before.jpg" alt="前の年"><figcaption>${r.before.date}</figcaption></figure>
        <figure><img src="/data/crops/${p.id}-after.jpg" alt="後の年"><figcaption>${r.after.date}</figcaption></figure>
      </div>
      <table class="facts">
        <tr><th>NDVI（植物の量）</th><td>${p.ndvi_before} → ${p.ndvi_after}</td></tr>
        <tr><th>下がり方（年のずれを除く）</th><td>${p.ndvi_drop}</td></tr>
        <tr><th>地図に登録された道路まで</th><td>${road}</td></tr>
        <tr><th>位置</th><td>南緯 ${(-p.lat).toFixed(4)}°・西経 ${(-p.lon).toFixed(4)}°</td></tr>
      </table>
      ${
        e
          ? `<h3>理由の候補（AI）</h3><p>${esc(e.summary)}</p><ol class="cands">${e.candidates
              .map((c) => `<li><b>${esc(c.cause)}</b><span class="lk lk-${esc(c.likelihood)}">${esc(c.likelihood)}</span><br><span class="ev">${esc(c.evidence)}</span></li>`)
              .join("")}</ol>
             <p class="check ${e.unmatchedNumbers.length ? "warn" : "ok"}">${e.unmatchedNumbers.length ? `⚠ 計算した値にない数字：${e.unmatchedNumbers.map(esc).join("、")}` : "✓ 説明の数字は、すべて計算した値と一致"}</p>
             <p class="muted">AI（Claude）が画像と数字から挙げた候補です。現地で確かめたものではありません。</p>`
          : `<p class="muted">AI の説明は、面積の大きい12か所だけに付けています。</p>`
      }`;
    map.panTo([p.lat, p.lon]);
    for (const [id, m] of markers) m.setStyle({ weight: id === p.id ? 4 : 1.5, color: id === p.id ? "#1f5fbf" : "#fff" });
  }

  // ---------- 一覧 ----------
  const tbody = document.querySelector("#list tbody")!;
  tbody.innerHTML = r.patches
    .slice(0, 20)
    .map((p) => {
      const e = ex[p.id];
      return `<tr data-id="${p.id}"><td class="num">${p.id}</td><td class="num">${ha(p.area_ha)}</td><td class="num">${p.ndvi_before} → ${p.ndvi_after}</td><td>${e ? e.candidates.map((c) => `${esc(c.cause)}（${esc(c.likelihood)}）`).join("・") : '<span class="muted">—</span>'}</td></tr>`;
    })
    .join("");
  tbody.addEventListener("click", (e) => {
    const id = Number((e.target as HTMLElement).closest("tr")?.dataset.id);
    const p = r.patches.find((x) => x.id === id);
    if (p) {
      show(p);
      $("map").scrollIntoView({ behavior: "smooth" });
    }
  });

  // ---------- 計算のしかた ----------
  $("method").innerHTML = `
    <ul>
      <li><b>NDVI</b>：植物の量の指標。（近赤外 − 赤）÷（近赤外 ＋ 赤）。森はおよそ0.6〜0.9、草地や裸地は低い</li>
      <li><b>森の判定</b>：前の年の NDVI が ${r.rules.forest_ndvi} 以上（${esc(r.rules.forest_method)}で画像ごとに決めた境目）</li>
      <li><b>年ごとのずれ</b>：2024年は記録的な干ばつと煙で森全体の NDVI が低かった。前の年に森だった所の変化の中央値（${r.rules.year_shift}）を差し引いてから比べた（森の大部分は変化していないので、これを「変化なし」とみなす）</li>
      <li><b>変化</b>：NDVI が ${r.rules.drop_ndvi} 以上下がった森。${r.rules.min_area_ha} ha より小さいまとまりは除いた。雲と影はシーン分類（SCL）で除いた</li>
      <li><b>答え合わせ</b>：メリーランド大学の森林減少データ（Hansen ら、Global Forest Watch の元データ）で、この範囲の2025年の減少は ${ha(ev.truth_ha)}。
        検知した場所のうち ${pct(ev.precision)} がそこに含まれ（適合率）、減少の ${pct(ev.recall)} を見つけた（再現率）。
        決まった値で森を判定する最初のやり方では、見つけられたのは ${pct(ev.baseline.recall)} だけだった</li>
      <li><b>限界</b>：後の年の画像は ${r.after.date}（雨季は雲で使える画像がない）なので、それ以降に切られた森は写っていない。前の年の画像の後、2024年中に切られた森も「変化」に入る（検知したのに答えになかった場所の ${pct(ev.fp_lost_2024)} は、2024年の減少だった）</li>
    </ul>`;

  mountAttribution($("attribution"), sources);
  show(r.patches[0]);
}

main();
