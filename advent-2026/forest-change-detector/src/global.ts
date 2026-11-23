// 地球全体の森林減少の地図（2001〜2025年のタイムライン）
import L from "leaflet";
import { decodeTile, FIRST_YEAR, LAST_YEAR, tileUrl } from "../lib/gfw.js";

/**
 * 描いているタイルの元の画素。キーはタイルの canvas そのもの。
 * 座標（z/x/y）をキーにすると、地図が横に繰り返して表示されたとき（アメリカ大陸が左右に2つ見えるなど）、
 * 同じ座標の2枚が上書きし合い、片方が塗り直されずに最初の年の色のまま残った（試してもらって分かった）
 */
type States = Map<HTMLCanvasElement, Uint8ClampedArray>;
type LossGridLayer = L.GridLayer & { _states: States };

/** GFW のタイルを読み込み、年に合わせて塗り直すレイヤー */
const LossLayer = L.GridLayer.extend({
  initialize(this: LossGridLayer, options: L.GridLayerOptions) {
    L.setOptions(this, options);
    this._states = new Map();
    // 画面から外れて捨てられたタイルは、覚えておく必要がない
    this.on("tileunload", (e: L.TileEvent) => this._states.delete(e.tile as unknown as HTMLCanvasElement)); // GridLayer のタイルは createTile が返した canvas
  },
  createTile(this: LossGridLayer, coords: L.Coords, done: L.DoneCallback) {
    // Leaflet の 512px の格子では、表示の縮尺 Z のタイルの範囲が、256px のタイルの Z−1 の範囲と同じ。
    // GFW のタイルは「256px のタイルと同じ範囲を 512px で」描いたものなので、Z−1 を取る
    // （TileLayer の zoomOffset に当たる処理。GridLayer では zoomOffset が効かないので自分でずらす。最初はこれを忘れて位置がずれた）
    const z = coords.z - 1;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const img = new Image();
    img.crossOrigin = "anonymous"; // 画素を読むために必要（GFW は access-control-allow-origin: * を返す）
    img.onload = () => {
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, 512, 512);
      this._states.set(canvas, new Uint8ClampedArray(data.data));
      paint(canvas, data.data);
      done(undefined, canvas);
    };
    img.onerror = () => done(new Error("タイルを読み込めませんでした"), canvas);
    img.src = tileUrl(z, coords.x, coords.y);
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

/** 地図を作る。年が変わるたびに onYear を呼ぶ。戻り値の setYear で、外から年を変えられる */
export function mountGlobalMap(opts: { onYear: (year: number) => void }) {
  const map = L.map("global-map", { worldCopyJump: true, minZoom: 2, maxZoom: 12 }).setView([-5, -20], 2);
  // 背景は白黒にして、森林減少の色を目立たせる（CSS で灰色にしている）
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 12,
    className: "gray-tiles",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  // GFW のタイルは 512px。取得する縮尺は createTile の中で1つ下げる
  const loss = new (LossLayer as unknown as new (o: L.GridLayerOptions) => LossGridLayer)({
    tileSize: 512,
    minZoom: 2,
    maxNativeZoom: 12,
    attribution:
      'Tree cover loss: Hansen et al. 2013, UMD/Google/USGS/NASA. Accessed through <a href="https://www.globalnaturewatch.org/">Global Nature Watch</a> | powered by <a href="https://resourcewatch.org">Resource Watch</a>',
  } as L.GridLayerOptions).addTo(map);

  const redrawAll = () => {
    for (const [canvas, src] of loss._states) paint(canvas, src);
    yearLabel.textContent = onlyThisYear ? `${currentYear}年に減った森` : `2001〜${currentYear}年に減った森`;
    slider.value = String(currentYear);
    opts.onYear(currentYear);
  };

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
  return {
    map,
    setYear(year: number) {
      currentYear = Math.min(LAST_YEAR, Math.max(FIRST_YEAR, year));
      redrawAll();
    },
  };
}
