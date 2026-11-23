// 地球全体の森林減少の地図（2001〜2025年のタイムライン）
import L from "leaflet";
import { decodeTile, FIRST_YEAR, LAST_YEAR, tileUrl } from "../lib/gfw.js";

interface TileState {
  canvas: HTMLCanvasElement;
  src: Uint8ClampedArray;
}

/** GFW のタイルを読み込み、年に合わせて塗り直すレイヤー */
const LossLayer = L.GridLayer.extend({
  initialize(this: L.GridLayer & { _states: Map<string, TileState> }, options: L.GridLayerOptions) {
    L.setOptions(this, options);
    this._states = new Map();
  },
  createTile(this: L.GridLayer & { _states: Map<string, TileState> }, coords: L.Coords, done: L.DoneCallback) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const img = new Image();
    img.crossOrigin = "anonymous"; // 画素を読むために必要（GFW は access-control-allow-origin: * を返す）
    img.onload = () => {
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, 512, 512);
      const key = `${coords.z}/${coords.x}/${coords.y}`;
      this._states.set(key, { canvas, src: new Uint8ClampedArray(data.data) });
      paint(canvas, data.data);
      done(undefined, canvas);
    };
    img.onerror = () => done(new Error("タイルを読み込めませんでした"), canvas);
    img.src = tileUrl(coords.z, coords.x, coords.y);
    return canvas;
  },
});

let currentYear = LAST_YEAR;
let onlyThisYear = false;

function paint(canvas: HTMLCanvasElement, src: Uint8ClampedArray) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const out = new ImageData(512, 512);
  decodeTile(src, out.data, { year: currentYear, onlyThisYear });
  ctx.putImageData(out, 0, 0);
}

export function mountGlobalMap(opts: { focus: { west: number; south: number; east: number; north: number }; onFocusClick: () => void }) {
  const map = L.map("global-map", { worldCopyJump: true, minZoom: 2, maxZoom: 12 }).setView([-5, -20], 2);
  // 背景は白黒にして、森林減少の色を目立たせる（CSS で灰色にしている）
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 12,
    className: "gray-tiles",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  // GFW のタイルは 512px で、256px のタイルと同じ z/x/y の範囲を表す。tileSize 512 と zoomOffset -1 で表示の縮尺に合わせる
  const loss = new (LossLayer as unknown as new (o: L.GridLayerOptions) => L.GridLayer & { _states: Map<string, TileState> })({
    tileSize: 512,
    zoomOffset: -1,
    maxNativeZoom: 12,
    attribution:
      'Tree cover loss: Hansen et al. 2013, UMD/Google/USGS/NASA. Accessed through <a href="https://www.globalnaturewatch.org/">Global Nature Watch</a> | powered by <a href="https://resourcewatch.org">Resource Watch</a>',
  } as L.GridLayerOptions).addTo(map);

  const redrawAll = () => {
    for (const s of loss._states.values()) if (s.canvas.isConnected) paint(s.canvas, s.src);
    yearLabel.textContent = onlyThisYear ? `${currentYear}年に減った森` : `2001〜${currentYear}年に減った森`;
    slider.value = String(currentYear);
  };

  // 拡大して衛星画像で確かめる場所（Day05 の分析の範囲）
  const f = opts.focus;
  L.rectangle(
    [
      [f.south, f.west],
      [f.north, f.east],
    ],
    { color: "#1f5fbf", weight: 2, fill: false },
  )
    .bindTooltip("ここを衛星画像で詳しく分析（押すと下に移動）")
    .on("click", opts.onFocusClick)
    .addTo(map);

  // ---------- タイムラインの操作 ----------
  const slider = document.getElementById("year") as HTMLInputElement;
  const yearLabel = document.getElementById("year-label")!;
  const play = document.getElementById("play") as HTMLButtonElement;
  slider.min = String(FIRST_YEAR);
  slider.max = String(LAST_YEAR);
  slider.value = String(LAST_YEAR);
  slider.addEventListener("input", () => {
    currentYear = Number(slider.value);
    redrawAll();
  });
  (document.getElementById("only-year") as HTMLInputElement).addEventListener("change", (e) => {
    onlyThisYear = (e.target as HTMLInputElement).checked;
    redrawAll();
  });
  let timer: number | undefined;
  play.addEventListener("click", () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
      play.textContent = "▶ 再生";
      return;
    }
    if (currentYear >= LAST_YEAR) currentYear = FIRST_YEAR - 1;
    play.textContent = "■ 止める";
    timer = window.setInterval(() => {
      currentYear++;
      redrawAll();
      if (currentYear >= LAST_YEAR) {
        clearInterval(timer);
        timer = undefined;
        play.textContent = "▶ 再生";
      }
    }, 700);
  });
  redrawAll();
  return map;
}
