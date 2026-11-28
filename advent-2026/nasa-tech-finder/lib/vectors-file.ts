// 特許のベクトル（vectors/patents.json）。Voyage の無料の制限（1分に1万トークン）では作るのに十数分かかるので、
// 手元で作って Git に入れる（約400KB）。特許の本文は入れず、デプロイのビルドで NASA から集めた本文と ID で結びつける
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const VECTORS_FILE = "vectors/patents.json";

export interface VectorsFile {
  model: string;
  dim: number;
  updatedAt: string;
  /** 特許の ID → int8 のベクトル（base64） */
  vectors: Record<string, string>;
}

export function readVectors(path = VECTORS_FILE): VectorsFile | null {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as VectorsFile) : null;
}

export function writeVectors(f: VectorsFile, path = VECTORS_FILE) {
  // ID の順に並べて、作り直したときの差分を小さくする
  const vectors = Object.fromEntries(Object.entries(f.vectors).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(path, JSON.stringify({ ...f, vectors }, null, 0).replace(/,"/g, ',\n"') + "\n");
}
