// CesiumJS は静的ファイル（Workers など）の場所を、読み込む前に知っている必要がある
(window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = "/cesium/";

import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";
import { mountAttribution } from "@advent/attribution";
import { expandGp, geodetic, orbitRingEcf, orbitSummary, toSatrec, type CompactGp, type Gp, type Regime } from "@advent/orbit";
import { CATEGORIES } from "../lib/category.js";
import { categoryFromName, CATEGORY_INDEX } from "../lib/category.js";
import { factsOf, type Catalog, type UcsRecord } from "../lib/facts.js";
import { OWNER_JA } from "../lib/owners.js";
import { sources } from "../lib/sources.js";
import type { WorkerIn, WorkerOut } from "./worker.js";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = new Intl.NumberFormat("ja-JP");

// 種類の色（地球儀は暗い背景なので、暗い背景向けに検証した色。順番は lib/category.ts と同じ）
const COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#9a9a92"];
const REGIMES: Regime[] = ["低軌道", "中軌道", "静止軌道", "傾斜対地同期軌道", "長楕円軌道", "その他"];
/** 何秒（実時間）ごとに位置を計算し直すか。そのあいだは直線で補間する */
const STEP_REAL_SEC = 0.25;

async function main() {
  mountAttribution($("attribution"), sources);
  const [gpRes, catalog] = await Promise.all([
    fetch("/api/gp").then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
      return r.json() as Promise<CompactGp & { stale?: boolean }>;
    }),
    fetch("/data/catalog.json").then((r) => r.json() as Promise<Catalog>),
  ]);
  const gps = expandGp(gpRes);
  const n = gps.length;

  // 衛星ごとの属性（種類・所有者・軌道の区分）
  const cat = new Uint8Array(n);
  const owner: string[] = [];
  const regime: Regime[] = [];
  for (let i = 0; i < n; i++) {
    const c = catalog.sats[String(gps[i].NORAD_CAT_ID)];
    // カタログを作ったあとに打ち上げられた衛星は、名前だけで決める
    cat[i] = c ? c[0] : CATEGORY_INDEX[categoryFromName(gps[i].OBJECT_NAME)];
    owner.push(c?.[1] ?? "");
    regime.push(orbitSummary(gps[i]).regime);
  }

  const { createGlobe, PointCloud, Cesium } = await import("@advent/globe");
  const viewer = await createGlobe($("globe"));
  const colors = COLORS.map((c) => Cesium.Color.fromCssColorString(c));
  const cloud = new PointCloud(viewer, n, (i) => colors[cat[i]], 3);

  // ---------- 絞り込み ----------
  const state = {
    cats: new Set(CATEGORIES.map((_, i) => i)),
    regimes: new Set(REGIMES),
    owner: "",
    selected: -1,
  };
  const visible = new Uint8Array(n);
  function applyFilter() {
    const shown = new Array(CATEGORIES.length).fill(0);
    for (let i = 0; i < n; i++) {
      const v = state.cats.has(cat[i]) && state.regimes.has(regime[i]) && (!state.owner || owner[i] === state.owner);
      visible[i] = v || i === state.selected ? 1 : 0;
      if (v) shown[cat[i]]++;
    }
    renderCounts(shown);
  }

  const total = new Array(CATEGORIES.length).fill(0);
  for (let i = 0; i < n; i++) total[cat[i]]++;

  const ul = $("categories");
  CATEGORIES.forEach((c, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<label><input type="checkbox" checked data-cat="${i}" /><span class="swatch" style="--c:${COLORS[i]}"></span><span class="name">${c.label}</span><span class="num" data-num="${i}"></span></label>`;
    ul.append(li);
  });
  ul.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    const i = Number(t.dataset.cat);
    if (t.checked) state.cats.add(i);
    else state.cats.delete(i);
    applyFilter();
  });
  const setCats = (ids: number[]) => {
    state.cats = new Set(ids);
    ul.querySelectorAll<HTMLInputElement>("input").forEach((el) => (el.checked = state.cats.has(Number(el.dataset.cat))));
    applyFilter();
  };
  $("all-on").onclick = () => setCats(CATEGORIES.map((_, i) => i));
  $("starlink-off").onclick = () => setCats(CATEGORIES.map((_, i) => i).filter((i) => CATEGORIES[i].id !== "starlink"));

  const regimeCount = new Map<Regime, number>();
  regime.forEach((r) => regimeCount.set(r, (regimeCount.get(r) ?? 0) + 1));
  for (const r of REGIMES) {
    if (!regimeCount.get(r)) continue;
    const b = document.createElement("button");
    b.className = "chip on";
    b.textContent = `${r} ${fmt.format(regimeCount.get(r)!)}`;
    b.onclick = () => {
      if (state.regimes.has(r)) state.regimes.delete(r);
      else state.regimes.add(r);
      b.classList.toggle("on", state.regimes.has(r));
      applyFilter();
    };
    $("regimes").append(b);
  }

  const ownerCount = new Map<string, number>();
  owner.forEach((o) => o && ownerCount.set(o, (ownerCount.get(o) ?? 0) + 1));
  const ownerName = (o: string) => OWNER_JA[o] ?? catalog.owners[o] ?? o;
  $<HTMLSelectElement>("owner").innerHTML =
    `<option value="">すべて（${ownerCount.size}）</option>` +
    [...ownerCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([o, c]) => `<option value="${o}">${ownerName(o)}（${fmt.format(c)}）</option>`)
      .join("");
  $<HTMLSelectElement>("owner").onchange = (e) => {
    state.owner = (e.target as HTMLSelectElement).value;
    applyFilter();
  };

  function renderCounts(shown: number[]) {
    CATEGORIES.forEach((_, i) => {
      const el = ul.querySelector(`[data-num="${i}"]`)!;
      el.textContent = shown[i] === total[i] ? fmt.format(total[i]) : `${fmt.format(shown[i])} / ${fmt.format(total[i])}`;
    });
    $("counts").querySelector("tbody")!.innerHTML =
      CATEGORIES.map(
        (c, i) =>
          `<tr><td><span class="swatch" style="--c:${COLORS[i]}"></span>${c.label}</td><td class="r">${fmt.format(total[i])}</td><td class="r">${fmt.format(shown[i])}</td></tr>`,
      ).join("") +
      `<tr class="sum"><td>合計</td><td class="r">${fmt.format(n)}</td><td class="r">${fmt.format(shown.reduce((a, b) => a + b, 0))}</td></tr>`;
  }
  applyFilter();

  // ---------- 時間と位置 ----------
  let speed = 1;
  let simBase = Date.now();
  let realBase = performance.now();
  const simNow = () => simBase + (performance.now() - realBase) * speed;

  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const send = (m: WorkerIn) => worker.postMessage(m);
  let generation = 0;
  let snaps: { t: number; p: Float32Array }[] = [];
  let lastRequested = -Infinity;
  let inflight = 0;
  let computeMs = 0;
  const cur = new Float32Array(n * 3).fill(NaN);

  const stepMs = () => STEP_REAL_SEC * 1000 * speed;
  function requestAhead() {
    // 表示中の時刻より2つ先まで、計算を頼んでおく
    const now = simNow();
    if (lastRequested < now - stepMs()) lastRequested = Math.floor(now / stepMs()) * stepMs() - stepMs();
    while (inflight < 2 && lastRequested < now + 2 * stepMs()) {
      lastRequested += stepMs();
      inflight++;
      send({ type: "compute", t: lastRequested, id: generation });
    }
  }
  worker.onmessage = (e: MessageEvent<WorkerOut>) => {
    const m = e.data;
    if (m.type === "ready") {
      requestAhead();
      return;
    }
    inflight = Math.max(0, inflight - 1);
    if (m.id !== generation) return;
    computeMs = computeMs ? computeMs * 0.9 + m.ms * 0.1 : m.ms;
    snaps.push({ t: m.t, p: m.positions });
    snaps.sort((a, b) => a.t - b.t);
    requestAhead();
  };
  send({ type: "init", gp: gpRes });

  function resetTime(newSpeed: number, toNow = false) {
    simBase = toNow ? Date.now() : simNow();
    realBase = performance.now();
    speed = newSpeed;
    generation++;
    snaps = [];
    inflight = 0;
    lastRequested = -Infinity;
    requestAhead();
  }
  document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll("[data-speed]").forEach((x) => x.classList.toggle("on", x === b));
      resetTime(Number(b.dataset.speed));
    };
  });
  $("now").onclick = () => resetTime(speed, true);

  // 毎フレーム：前後の計算結果のあいだを補間して、点を動かす
  let frames = 0;
  let fps = 0;
  let fpsSince = performance.now();
  const fpsLog: number[] = [];
  viewer.scene.preRender.addEventListener(() => {
    const t = simNow();
    while (snaps.length > 2 && snaps[1].t <= t) snaps.shift();
    if (snaps.length >= 2 && snaps[0].t <= t) {
      const [a, b] = snaps;
      const f = Math.min(1, (t - a.t) / (b.t - a.t));
      for (let k = 0; k < cur.length; k++) cur[k] = a.p[k] + (b.p[k] - a.p[k]) * f;
    } else if (snaps.length) {
      cur.set(snaps[0].p);
    }
    cloud.update(cur, (i) => visible[i] === 1);
    if (snaps.length && snaps[0].t < t - 4 * stepMs()) requestAhead();
  });
  viewer.scene.postRender.addEventListener(() => {
    frames++;
    const now = performance.now();
    if (now - fpsSince >= 1000) {
      fps = (frames * 1000) / (now - fpsSince);
      frames = 0;
      fpsSince = now;
      fpsLog.push(fps);
      if (fpsLog.length > 10) fpsLog.shift();
      const avg = fpsLog.reduce((a, b) => a + b, 0) / fpsLog.length;
      $("perf").textContent = `描画 ${fps.toFixed(0)} コマ/秒（10秒平均 ${avg.toFixed(0)}）・位置の計算 ${computeMs.toFixed(0)} ms/回`;
      (window as unknown as { __perf: unknown }).__perf = { fps, avg10: avg, computeMs, satellites: n };
      renderClock();
    }
  });
  viewer.scene.requestRenderMode = false;

  const jst = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "medium" });
  function renderClock() {
    const t = new Date(simNow());
    $("sim-time").textContent = `${jst.format(t)}（日本時間）${speed === 1 ? "" : ` ・ ${speed}倍速`}`;
  }

  const fetched = new Date(gpRes.fetchedAt);
  $("status").textContent = `稼働中の人工衛星 ${fmt.format(n)} 機 ・ 軌道要素の取得：${jst.format(fetched)}${gpRes.stale ? "（取得の待ち中のため、少し古いデータ）" : ""}`;

  // ---------- 選択 ----------
  let ucs: Record<string, UcsRecord> | null = null;
  let ring: InstanceType<typeof Cesium.Entity> | null = null;
  let selSatrec: ReturnType<typeof toSatrec> = null;

  function select(i: number, fly = false) {
    if (state.selected >= 0) cloud.setStyle(state.selected, colors[cat[state.selected]], 3);
    state.selected = i;
    applyFilter();
    if (ring) viewer.entities.remove(ring);
    ring = null;
    if (i < 0) {
      $("selected").hidden = true;
      return;
    }
    cloud.setStyle(i, Cesium.Color.WHITE, 10);
    selSatrec = toSatrec(gps[i]);
    ring = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          if (!selSatrec) return [];
          return orbitRingEcf(selSatrec, new Date(simNow()), 180).map((p) => new Cesium.Cartesian3(p.x * 1000, p.y * 1000, p.z * 1000));
        }, false),
        width: 1.5,
        material: Cesium.Color.WHITE.withAlpha(0.6),
        arcType: Cesium.ArcType.NONE,
      },
    });
    renderSelected(i);
    if (fly) {
      const x = cur[i * 3];
      if (!Number.isNaN(x)) {
        const p = new Cesium.Cartesian3(cur[i * 3] * 1000, cur[i * 3 + 1] * 1000, cur[i * 3 + 2] * 1000);
        const r = Cesium.Cartesian3.magnitude(p);
        viewer.camera.flyTo({ destination: Cesium.Cartesian3.multiplyByScalar(p, (r + Math.max(8e6, r * 0.6)) / r, new Cesium.Cartesian3()), duration: 1.5 });
      }
    }
  }

  async function renderSelected(i: number) {
    const gp = gps[i];
    $("selected").hidden = false;
    $("sel-name").textContent = gp.OBJECT_NAME;
    $("explanation").hidden = true;
    $<HTMLButtonElement>("explain").disabled = false;
    ucs ??= await fetch("/data/ucs.json").then((r) => r.json());
    if (state.selected !== i) return;
    const f = factsOf(gp, catalog, ucs![String(gp.NORAD_CAT_ID)]);
    const rows: [string, string][] = [
      ["種類", String(f.種類)],
      ["国・組織", f.所有者],
      ["打ち上げ日", f.打ち上げ日],
      ["軌道", `${f.軌道.区分}・高さ ${fmt.format(f.軌道.高さ_近地点_km)}〜${fmt.format(f.軌道.高さ_遠地点_km)} km`],
      ["1周", `${f.軌道["1周の時間_分"]} 分（1日 ${f.軌道["1日の周回数"]} 周）`],
      ["軌道の傾き", `${f.軌道.軌道傾斜角_度} 度`],
      ["今の位置", ""],
      ["軌道要素", `${f.軌道要素の日時}（${f.軌道要素の古さ_日} 日前）`],
      ["NORAD 番号", String(f.NORAD番号)],
    ];
    if (typeof f.UCS === "object") {
      rows.push(["目的（UCS）", [f.UCS.目的, f.UCS.詳しい目的].filter(Boolean).join("・")]);
      rows.push(["運用者（UCS）", `${f.UCS.運用者}（${f.UCS.運用者の国}）`]);
      rows.push(["利用者（UCS）", f.UCS.利用者]);
    } else {
      rows.push(["UCS", "載っていない（2023年5月で更新停止）"]);
    }
    const dl = $("sel-facts");
    dl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd${k === "今の位置" ? ' id="sel-pos"' : ""}>${escapeHtml(v)}</dd>`).join("");
    renderPosition();
  }

  function renderPosition() {
    const el = document.getElementById("sel-pos");
    if (!el || !selSatrec) return;
    const g = geodetic(selSatrec, new Date(simNow()));
    if (!g) {
      el.textContent = "計算できません（軌道要素が古いか、落下した可能性）";
      return;
    }
    const ns = g.lat >= 0 ? "北緯" : "南緯";
    const ew = g.lon >= 0 ? "東経" : "西経";
    el.textContent = `${ns} ${Math.abs(g.lat).toFixed(1)}°・${ew} ${Math.abs(g.lon).toFixed(1)}°・高さ ${fmt.format(Math.round(g.altKm))} km`;
  }
  setInterval(renderPosition, 500);

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((e: { position: InstanceType<typeof Cesium.Cartesian2> }) => {
    const picked = viewer.scene.pick(e.position);
    if (picked && picked.primitive instanceof Cesium.PointPrimitive && typeof picked.id === "number") select(picked.id);
    else if (!picked) select(-1);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 名前で探す
  const byName = new Map(gps.map((g, i) => [g.OBJECT_NAME, i]));
  const popular = ["ISS (ZARYA)", "CSS (TIANHE)", "HST", "HIMAWARI-9", "QZS-2 (MICHIBIKI-2)", "GOES 19", "NOAA 20 (JPSS-1)"].filter((x) => byName.has(x));
  $("names").innerHTML = [...popular, ...gps.map((g) => g.OBJECT_NAME).filter((x) => !popular.includes(x))]
    .slice(0, 400)
    .map((x) => `<option value="${escapeHtml(x)}"></option>`)
    .join("");
  $<HTMLInputElement>("search").addEventListener("input", (e) => {
    const q = (e.target as HTMLInputElement).value.trim().toUpperCase();
    if (!q) return;
    // 完全に一致すれば選ぶ。候補の一覧は、入力に合うものに絞る
    const exact = byName.get(q);
    if (exact !== undefined) return select(exact, true);
    const hits = gps.filter((g) => g.OBJECT_NAME.includes(q)).slice(0, 50);
    $("names").innerHTML = hits.map((g) => `<option value="${escapeHtml(g.OBJECT_NAME)}"></option>`).join("");
    if (hits.length === 1) select(byName.get(hits[0].OBJECT_NAME)!, true);
  });

  // AI の解説
  $("explain").onclick = async () => {
    const i = state.selected;
    if (i < 0) return;
    const btn = $<HTMLButtonElement>("explain");
    const box = $("explanation");
    btn.disabled = true;
    box.hidden = false;
    box.textContent = "解説を作成中…（10秒ほどかかります）";
    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ norad: gps[i].NORAD_CAT_ID }),
      });
      const j = await r.json();
      if (state.selected !== i) return;
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      const warn = j.unmatchedNumbers?.length
        ? `<p class="warn">⚠ 事実と照合できなかった数字：${j.unmatchedNumbers.map(escapeHtml).join("、")}</p>`
        : `<p class="ok">✓ 解説の中の数字は、すべてカタログか軌道の計算と一致しました</p>`;
      box.innerHTML = `${j.text
        .split(/\n+/)
        .map((p: string) => `<p>${escapeHtml(p)}</p>`)
        .join("")}${warn}<p class="muted small">Claude による解説${j.cached ? "（保存した解説）" : ""}。根拠はカタログと軌道の数字だけで、誤りを含むことがあります。</p>`;
    } catch (err) {
      box.textContent = (err as Error).message;
      btn.disabled = false;
    }
  };

  // URL の #25544 で衛星を選んだ状態にする（記事や共有用）
  const hash = Number(location.hash.slice(1));
  if (hash) {
    const i = gps.findIndex((g) => g.NORAD_CAT_ID === hash);
    if (i >= 0) setTimeout(() => select(i, true), 1500);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

main().catch((err) => {
  console.error(err);
  document.getElementById("status")!.textContent = `読み込みに失敗しました：${(err as Error).message}`;
});

export type { Gp };
