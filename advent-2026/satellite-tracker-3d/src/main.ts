// CesiumJS は静的ファイル（Workers など）の場所を、読み込む前に知っている必要がある
(window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = "/cesium/";

import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";
import { mountAttribution } from "@advent/attribution";
import { expandGp, geodetic, orbitRingEcf, orbitSummary, positionsEcf, toSatrec, type CompactGp, type Gp, type Regime } from "@advent/orbit";
import { CATEGORIES } from "../lib/category.js";
import { categoryFromName, CATEGORY_INDEX } from "../lib/category.js";
import { factsOf, REGIME_EN, type Catalog, type UcsRecord } from "../lib/facts.js";
import { OWNER_JA } from "../lib/owners.js";
import { sources, sourcesEn } from "../lib/sources.js";
import { applyStatic, lang, switchLang, t } from "./i18n.js";
import type { WorkerIn, WorkerOut } from "./worker.js";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = new Intl.NumberFormat(t.numLocale);
const en = lang === "en";
/** 種類・軌道の区分の表示名 */
const catLabel = (i: number) => (en ? CATEGORIES[i].en : CATEGORIES[i].label);
const regimeLabel = (r: Regime) => (en ? REGIME_EN[r] : r);

// 種類の色（地球儀は暗い背景なので、暗い背景向けに検証した色。順番は lib/category.ts と同じ）
const COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#9a9a92"];
const REGIMES: Regime[] = ["低軌道", "中軌道", "静止軌道", "傾斜対地同期軌道", "長楕円軌道", "その他"];
/** 何秒（実時間）ごとに位置を計算し直すか。そのあいだは直線で補間する */
const STEP_REAL_SEC = 0.25;

async function main() {
  applyStatic();
  $("lang").onclick = () => switchLang(en ? "ja" : "en");
  mountAttribution($("attribution"), en ? sourcesEn : sources, { lang });
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
    li.innerHTML = `<label><input type="checkbox" checked data-cat="${i}" /><span class="swatch" style="--c:${COLORS[i]}"></span><span class="name">${catLabel(i)}</span><span class="num" data-num="${i}"></span></label>`;
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
    b.textContent = `${regimeLabel(r)} ${fmt.format(regimeCount.get(r)!)}`;
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
  const ownerName = (o: string) => (en ? undefined : OWNER_JA[o]) ?? catalog.owners[o] ?? o;
  $<HTMLSelectElement>("owner").innerHTML =
    `<option value="">${t.all(ownerCount.size)}</option>` +
    [...ownerCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([o, c]) => `<option value="${o}">${escapeHtml(t.ownerOption(ownerName(o), fmt.format(c)))}</option>`)
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
  const selPos = new Float32Array(3);
  let selSatrec: ReturnType<typeof toSatrec> = null;

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
    // 時間を戻す前に頼んだ分は捨てる（数えるのは今の世代だけ）
    if (m.id !== generation) return;
    inflight = Math.max(0, inflight - 1);
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
  const speedButtons = document.querySelectorAll<HTMLButtonElement>("[data-speed]");
  const markSpeed = (v: number) => speedButtons.forEach((x) => x.classList.toggle("on", Number(x.dataset.speed) === v));
  speedButtons.forEach((b) => {
    b.onclick = () => {
      markSpeed(Number(b.dataset.speed));
      resetTime(Number(b.dataset.speed));
    };
  });
  // 「今」：今の時刻の実時間に戻す
  $("now").onclick = () => {
    markSpeed(1);
    resetTime(1, true);
    renderClock();
  };

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
      // 直線で補間すると弧の内側を通る（600倍で最大約24km）ので、
      // 地球の中心からの距離も前後の値で補間して、その長さに伸ばす
      const ap = a.p, bp = b.p;
      for (let k = 0; k < cur.length; k += 3) {
        const x = ap[k] + (bp[k] - ap[k]) * f;
        const y = ap[k + 1] + (bp[k + 1] - ap[k + 1]) * f;
        const z = ap[k + 2] + (bp[k + 2] - ap[k + 2]) * f;
        const ra = Math.hypot(ap[k], ap[k + 1], ap[k + 2]);
        const rb = Math.hypot(bp[k], bp[k + 1], bp[k + 2]);
        const s = (ra + (rb - ra) * f) / Math.hypot(x, y, z);
        cur[k] = x * s;
        cur[k + 1] = y * s;
        cur[k + 2] = z * s;
      }
    } else if (snaps.length) {
      cur.set(snaps[0].p);
    }
    // 選んでいる衛星だけは毎フレーム正確に計算して、軌道の輪とぴったり重ねる
    if (state.selected >= 0 && selSatrec && positionsEcf([selSatrec], new Date(t), selPos)) {
      cur.set(selPos, state.selected * 3);
    }
    cloud.update(cur, (i) => visible[i] === 1);
    // 先読みが切れないよう、毎フレーム足りない分を頼む（届いたときだけだと、使い切って止まる）
    requestAhead();
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
      $("perf").textContent = t.perf(fps.toFixed(0), avg.toFixed(0), computeMs.toFixed(0));
      (window as unknown as { __perf: unknown }).__perf = { fps, avg10: avg, computeMs, satellites: n };
      renderClock();
    }
  });
  viewer.scene.requestRenderMode = false;

  // 日本語は日本時間、英語は UTC で出す
  const clockFmt = new Intl.DateTimeFormat(t.numLocale, { timeZone: en ? "UTC" : "Asia/Tokyo", dateStyle: "medium", timeStyle: "medium" });
  function renderClock() {
    $("sim-time").textContent = t.clock(clockFmt.format(new Date(simNow())), speed);
  }

  const fetched = new Date(gpRes.fetchedAt);
  $("status").textContent = t.status(fmt.format(n), clockFmt.format(fetched), Boolean(gpRes.stale));

  // ---------- 選択 ----------
  // UCS の項目は、選んだ1機ぶんだけサーバーに聞く（まとめたファイルは配らない）
  const ucsCache = new Map<number, UcsRecord | null>();
  async function ucsOf(norad: number): Promise<UcsRecord | null | "error"> {
    if (ucsCache.has(norad)) return ucsCache.get(norad)!;
    try {
      const r = await fetch(`/api/sat?norad=${norad}`);
      if (!r.ok) return "error";
      const u = ((await r.json()) as { ucs: UcsRecord | null }).ucs;
      ucsCache.set(norad, u);
      return u;
    } catch {
      return "error";
    }
  }
  let ring: InstanceType<typeof Cesium.Entity> | null = null;

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
    const u = await ucsOf(gp.NORAD_CAT_ID);
    if (state.selected !== i) return;
    // 数字は factsOf（AI に渡すのと同じ計算）から取り、言葉だけ言語に合わせる
    const f = factsOf(gp, catalog, u === "error" ? undefined : (u ?? undefined));
    const c = catalog.sats[String(gp.NORAD_CAT_ID)];
    const ownerCode = c?.[1] ?? "";
    const R = t.rows;
    const rows: [string, string][] = [
      [R.category, c ? catLabel(c[0]) : t.afterCatalog],
      [R.owner, ownerCode ? `${ownerName(ownerCode)}${en ? ` (${ownerCode})` : `（${ownerCode}）`}` : t.unknown],
      [R.launch, c?.[2] || t.unknown],
      [R.orbit, t.orbitValue(regimeLabel(regime[i]), fmt.format(f.軌道.高さ_近地点_km), fmt.format(f.軌道.高さ_遠地点_km))],
      [R.period, t.periodValue(f.軌道["1周の時間_分"], f.軌道["1日の周回数"])],
      [R.inclination, t.degrees(f.軌道.軌道傾斜角_度)],
      [R.position, ""],
      [R.elements, t.elementsValue(f.軌道要素の日時, f.軌道要素の古さ_日)],
      [R.norad, String(f.NORAD番号)],
    ];
    if (typeof f.UCS === "object") {
      rows.push([R.ucsPurpose, [f.UCS.目的, f.UCS.詳しい目的].filter(Boolean).join(en ? ", " : "・")]);
      rows.push([R.ucsOperator, t.operatorValue(f.UCS.運用者, f.UCS.運用者の国)]);
      rows.push([R.ucsUsers, f.UCS.利用者]);
    } else {
      rows.push([R.ucs, u === "error" ? t.ucsFailed : t.notInUcs]);
    }
    const dl = $("sel-facts");
    dl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd${k === R.position ? ' id="sel-pos"' : ""}>${escapeHtml(v)}</dd>`).join("");
    renderPosition();
  }

  function renderPosition() {
    const el = document.getElementById("sel-pos");
    if (!el || !selSatrec) return;
    const g = geodetic(selSatrec, new Date(simNow()));
    if (!g) {
      el.textContent = t.positionFailed;
      return;
    }
    el.textContent = t.position(g.lat, g.lon, fmt.format(Math.round(g.altKm)));
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
    box.textContent = t.explaining;
    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ norad: gps[i].NORAD_CAT_ID, lang }),
      });
      const j = await r.json();
      if (state.selected !== i) return;
      if (!r.ok) throw new Error(t.apiError(r.status, j.error));
      const warn = j.unmatchedNumbers?.length
        ? `<p class="warn">${escapeHtml(t.unmatched(j.unmatchedNumbers.join(t.listSep)))}</p>`
        : `<p class="ok">${t.allMatched}</p>`;
      box.innerHTML = `${j.text
        .split(/\n+/)
        .map((p: string) => `<p>${escapeHtml(p)}</p>`)
        .join("")}${warn}<p class="muted small">${t.aiNote(Boolean(j.cached))}</p>`;
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
  document.getElementById("status")!.textContent = t.loadFailed((err as Error).message);
});

export type { Gp };
