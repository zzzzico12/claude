// 特許の一覧を集める（data/patents.json が7日以内なら使い回す。デプロイのビルドでは data/ がないので毎回集める）
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { collectPatents, type Patent } from "../lib/patents.js";

const RAW = "data/patents.json";
const MAX_AGE_DAYS = 7;

export async function loadPatents(): Promise<{ patents: Patent[]; fetchedAt: string }> {
  if (existsSync(RAW) && (Date.now() - statSync(RAW).mtimeMs) / 86400_000 < MAX_AGE_DAYS) {
    const patents = JSON.parse(readFileSync(RAW, "utf8")) as Patent[];
    console.log(`${RAW} を使う（${patents.length}件）`);
    return { patents, fetchedAt: statSync(RAW).mtime.toISOString() };
  }
  console.log("NASA T2 から特許を集める（約1分半）…");
  const patents = await collectPatents(console.log);
  mkdirSync("data", { recursive: true });
  writeFileSync(RAW, JSON.stringify(patents));
  return { patents, fetchedAt: new Date().toISOString() };
}
