// 位置の計算は Web Worker で（1万7千機の SGP4 は1回 数十ミリ秒かかり、画面が止まるので）
import { expandGp, positionsEcf, toSatrec, type CompactGp, type SatRec } from "@advent/orbit";

let satrecs: (SatRec | null)[] = [];

export type WorkerIn = { type: "init"; gp: CompactGp } | { type: "compute"; t: number; id: number };
export type WorkerOut =
  | { type: "ready"; count: number; failed: number }
  | { type: "positions"; t: number; id: number; positions: Float32Array; ms: number; ok: number };

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const m = e.data;
  if (m.type === "init") {
    satrecs = expandGp(m.gp).map(toSatrec);
    post({ type: "ready", count: satrecs.length, failed: satrecs.filter((s) => !s).length });
  } else {
    const start = performance.now();
    const positions = new Float32Array(satrecs.length * 3);
    const ok = positionsEcf(satrecs, new Date(m.t), positions);
    post({ type: "positions", t: m.t, id: m.id, positions, ms: performance.now() - start, ok }, [positions.buffer]);
  }
};

function post(m: WorkerOut, transfer: Transferable[] = []) {
  (self as unknown as Worker).postMessage(m, transfer);
}
