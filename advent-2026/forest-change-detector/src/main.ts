import { mountAttribution } from "@advent/attribution";
import "leaflet/dist/leaflet.css";
import { FIRST_YEAR, LAST_YEAR } from "../lib/gfw.js";
import { sources } from "../lib/sources.js";
import { mountGlobalMap } from "./global.js";

interface Group {
  name: string;
  loss: number[];
  fire: number[];
  primary: number[];
  drivers: Record<string, number[]>;
}
interface Stats {
  source: { dataset: string; version: string; threshold: number };
  years: number[];
  groups: Record<string, Group>;
  world: { loss: number[] };
}
interface EventItem {
  group: string;
  groupName: string;
  year: number;
  kind: string;
  loss_man_ha: number;
  prev_loss_man_ha: number;
  change_pct: number;
  ratio_to_prev: number;
  fire_share_pct: number;
  primary_share_pct: number;
  drivers: { name: string; share_pct: number }[];
  countries: { name: string; loss_man_ha: number; change_pct: number | null }[];
  text: string;
  citations: { url: string; title: string; cited_text: string }[];
  unmatchedNumbers: string[];
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** 面積：万 ha */
const man = (ha: number) => (ha / 10_000).toLocaleString("ja-JP", { maximumFractionDigits: ha < 100_000 ? 1 : 0 });
const signed = (p: number) => `${p > 0 ? "+" : ""}${p}%`;
const SVG = "http://www.w3.org/2000/svg";

async function main() {
  const [stats, events] = await Promise.all([
    fetch("/data/stats.json").then((r) => r.json() as Promise<Stats>),
    fetch("/data/events.json").then((r) => r.json() as Promise<EventItem[]>),
  ]);
  const years = stats.years;
  const keys = Object.keys(stats.groups);
  const yi = (y: number) => years.indexOf(y);

  let year = LAST_YEAR;

  // ---------- 選んだ年の数字 ----------
  function renderYear() {
    const i = yi(year);
    const total = stats.world.loss[i];
    const prev = i > 0 ? stats.world.loss[i - 1] : null;
    $("year-title").textContent = `${year}年：世界で ${man(total)} 万 ha の森が減った${
      prev ? `（前の年から ${signed(Math.round((total / prev - 1) * 100))}）` : ""
    }`;
    const rows = keys
      .map((k) => {
        const g = stats.groups[k];
        const topDriver = Object.entries(g.drivers)
          .filter(([name]) => name !== "不明")
          .sort((a, b) => b[1][i] - a[1][i])[0];
        return {
          g,
          loss: g.loss[i],
          fire: g.fire[i],
          change: i > 0 && g.loss[i - 1] > 0 ? Math.round((g.loss[i] / g.loss[i - 1] - 1) * 100) : null,
          driver: topDriver && g.loss[i] > 0 ? `${topDriver[0]}（${Math.round((topDriver[1][i] / g.loss[i]) * 100)}%）` : "—",
        };
      })
      .sort((a, b) => b.loss - a.loss);

    // 横棒（多い順）。棒の中を火災とそれ以外に分ける
    const max = Math.max(...rows.map((r) => r.loss));
    $("year-bars").innerHTML = rows
      .map(
        (r) => `<div class="hbar" title="${esc(r.g.name)}：${man(r.loss)} 万 ha（うち火災 ${man(r.fire)}）">
          <span class="hbar-label">${esc(r.g.name)}</span>
          <span class="hbar-track"><span class="seg fire" style="width:${(r.fire / max) * 100}%"></span><span class="seg other" style="width:${((r.loss - r.fire) / max) * 100}%"></span></span>
          <span class="hbar-value">${man(r.loss)}</span>
        </div>`,
      )
      .join("");
    // 表（色に頼らずに読める形）
    document.querySelector("#year-table tbody")!.innerHTML = rows
      .map(
        (r) =>
          `<tr><td>${esc(r.g.name)}</td><td class="num">${man(r.loss)}</td><td class="num">${man(r.fire)}</td><td class="num">${r.change === null ? "—" : signed(r.change)}</td><td>${esc(r.driver)}</td></tr>`,
      )
      .join("");
    for (const line of document.querySelectorAll<SVGLineElement>(".year-cursor")) {
      const x = line.getAttribute(`data-x${year}`) ?? "0";
      line.setAttribute("x1", x);
      line.setAttribute("x2", x);
    }
  }

  const map = mountGlobalMap({
    onYear: (y) => {
      year = y;
      renderYear();
    },
  });
  /** 地図の年を変える（地図から onYear が呼ばれて、グラフと表も更新される） */
  const setYear = (y: number) => map.setYear(y);

  // ---------- 地域ごとの推移（スモールマルチプル。全部同じ目盛り） ----------
  const yMax = Math.max(...keys.flatMap((k) => stats.groups[k].loss));
  const W = 320;
  const H = 120;
  const pad = { l: 34, r: 6, t: 10, b: 18 };
  const bw = (W - pad.l - pad.r) / years.length;
  const yScale = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / yMax);
  const step = yMax > 8_000_000 ? 5_000_000 : 2_000_000;
  const ticks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, n) => n * step);
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.hidden = true;
  document.body.append(tooltip);

  const multiples = $("multiples");
  for (const k of keys) {
    const g = stats.groups[k];
    const total = g.loss.reduce((a, b) => a + b, 0);
    const fireShare = g.fire.reduce((a, b) => a + b, 0) / total;
    const panel = document.createElement("figure");
    panel.className = "panel card";
    panel.innerHTML = `<figcaption><b>${esc(g.name)}</b><span class="muted">25年で ${man(total)} 万 ha・火災 ${Math.round(fireShare * 100)}%</span></figcaption>`;
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${g.name}の年ごとの森林減少（目盛りは万 ha）`);
    let html = "";
    for (const t of ticks) {
      html += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${yScale(t)}" y2="${yScale(t)}"/><text class="axis" x="${pad.l - 4}" y="${yScale(t) + 3}" text-anchor="end">${t / 10_000}</text>`;
    }
    const cursorData: string[] = [];
    years.forEach((y, i) => {
      const x = pad.l + i * bw + 1;
      const w = Math.max(1, bw - 2); // 棒と棒の間に 2px のすき間
      const yFire = yScale(g.fire[i]);
      const yAll = yScale(g.loss[i]);
      html += `<rect class="fire" x="${x}" y="${yFire}" width="${w}" height="${Math.max(0, H - pad.b - yFire)}"/>`;
      html += `<rect class="other" x="${x}" y="${yAll}" width="${w}" height="${Math.max(0, yFire - yAll - 1)}"/>`;
      html += `<rect class="hit" data-i="${i}" x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}"/>`;
      cursorData.push(`data-x${y}="${x + w / 2}"`);
      if (y % 5 === 0 || y === FIRST_YEAR) html += `<text class="axis" x="${x + w / 2}" y="${H - 5}" text-anchor="middle">${y}</text>`;
    });
    for (const e of events.filter((e) => e.group === k)) {
      const i = yi(e.year);
      html += `<circle class="event-dot" data-event="${k}-${e.year}" cx="${pad.l + i * bw + bw / 2}" cy="${Math.max(5, yScale(g.loss[i]) - 6)}" r="4"><title>${e.year}年：${esc(e.kind)}（下で説明）</title></circle>`;
    }
    html += `<line class="year-cursor" ${cursorData.join(" ")} y1="${pad.t}" y2="${H - pad.b}"/>`;
    svg.innerHTML = html;
    svg.addEventListener("mousemove", (ev) => {
      const t = (ev.target as Element).closest(".hit") as SVGRectElement | null;
      if (!t) {
        tooltip.hidden = true;
        return;
      }
      const i = Number(t.dataset.i);
      tooltip.hidden = false;
      tooltip.innerHTML = `<b>${esc(g.name)}・${years[i]}年</b><br>減少 ${man(g.loss[i])} 万 ha<br><span class="key fire"></span>火災 ${man(g.fire[i])}　<span class="key other"></span>それ以外 ${man(g.loss[i] - g.fire[i])}`;
      tooltip.style.left = `${ev.pageX + 12}px`;
      tooltip.style.top = `${ev.pageY + 12}px`;
    });
    svg.addEventListener("mouseleave", () => (tooltip.hidden = true));
    svg.addEventListener("click", (ev) => {
      const dot = (ev.target as Element).closest(".event-dot") as SVGCircleElement | null;
      if (dot) {
        document.getElementById(`event-${dot.dataset.event}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const hit = (ev.target as Element).closest(".hit") as SVGRectElement | null;
      if (hit) setYear(years[Number(hit.dataset.i)]);
    });
    panel.append(svg);
    multiples.append(panel);
  }

  // ---------- その年に何があったか ----------
  $("events").innerHTML = events
    .map((e) => {
      const urls = [...new Map(e.citations.map((c) => [c.url, c])).values()];
      return `<article class="event card" id="event-${e.group}-${e.year}">
        <header><b>${esc(e.groupName)}・${e.year}年</b><span class="tag">${esc(e.kind)}</span></header>
        <p class="facts">減少 <b>${e.loss_man_ha.toLocaleString("ja-JP")} 万 ha</b>（前の年 ${e.prev_loss_man_ha.toLocaleString("ja-JP")} 万 ha、${signed(e.change_pct)}）・火災 ${e.fire_share_pct}%・原生林 ${e.primary_share_pct}%<br>
          主な原因：${e.drivers.map((d) => `${esc(d.name)} ${d.share_pct}%`).join("、") || "—"}<br>
          多かった国：${e.countries.map((c) => `${esc(c.name)} ${c.loss_man_ha.toLocaleString("ja-JP")}万ha${c.change_pct === null ? "" : `（${signed(c.change_pct)}）`}`).join("、")}</p>
        ${e.text
          .split(/\n+/)
          .filter(Boolean)
          .map((p) => `<p>${esc(p)}</p>`)
          .join("")}
        <p class="sources">出典：${urls.map((c, n) => `<a href="${esc(c.url)}" target="_blank" rel="noopener">[${n + 1}] ${esc(c.title)}</a>`).join(" ")}</p>
        <p class="check ${e.unmatchedNumbers.length ? "warn" : "ok"}">${
          e.unmatchedNumbers.length
            ? `⚠ 集計にも出典の文にも見つからなかった数字：${e.unmatchedNumbers.map(esc).join("、")}`
            : "✓ 文中の数字は、すべて集計か出典の文と一致"
        }</p>
        <button type="button" class="link" data-year="${e.year}">地図を${e.year}年にする</button>
      </article>`;
    })
    .join("");
  $("events").addEventListener("click", (ev) => {
    const b = (ev.target as Element).closest("button[data-year]") as HTMLButtonElement | null;
    if (b) {
      setYear(Number(b.dataset.year));
      $("global-map").scrollIntoView({ behavior: "smooth" });
    }
  });

  $("method").innerHTML = `<ul>
    <li><b>森の減少</b>：メリーランド大学（Hansen ら）が衛星画像（Landsat）から30m単位で作ったデータ。高さ5m以上の木が失われた所。植林や自然の回復で増えた分は差し引いていない</li>
    <li><b>地域ごとの数字</b>：Global Forest Watch（Global Nature Watch）が国ごとに集計した数字（${esc(stats.source.dataset)}、${esc(stats.source.version)}、樹冠の割合${stats.source.threshold}%以上を森とする）を、Natural Earth の大陸ごとに合計した。ロシアは森の大半がシベリアにあり、世界で最も森が減っている国なので、別にした</li>
    <li><b>火災</b>：減少のうち火災によるもの。<b>原因</b>：WRI と Google の推定（農地への転換、伐採、山火事など）</li>
    <li><b>その年の説明</b>：年の選び方と数字はコード、説明の文は AI（Claude）がウェブ検索の結果をもとに書いた。出典のリンクを付け、文中の数字は集計か出典の文と自動で照合した。AI の文には誤りがありうるので、出典で確かめてほしい</li>
  </ul>`;

  mountAttribution($("attribution"), sources);
  renderYear();
}

main();
