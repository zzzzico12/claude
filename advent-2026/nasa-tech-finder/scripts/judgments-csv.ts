// eval/judgments.csv の読み書き（評価のスクリプトと、手元の確認用ページの両方で使う）
// 列：課題ID, 課題, 種類, ID, 題名, Claude の判定, 理由, 抜き取り, 人の判定（0・1・2）
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const JUDGMENTS = "eval/judgments.csv";
export const HEADER = ["課題ID", "課題", "種類", "ID", "題名", "Claude の判定", "理由", "抜き取り", "人の判定（0・1・2）"];
export const COL = { qid: 0, problem: 1, kind: 2, id: 3, title: 4, claude: 5, reason: 6, sample: 7, human: 8 } as const;

/** すべてのセルを "" で囲んだ CSV（このファイルの形）を読む */
export function parseCsv(text: string): string[][] {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((x) => x[1].replace(/""/g, '"')));
}

export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";

export function readJudgments(path = JUDGMENTS): string[][] {
  return existsSync(path) ? parseCsv(readFileSync(path, "utf8")).slice(1) : [];
}

export function writeJudgments(rows: string[][], path = JUDGMENTS) {
  writeFileSync(path, toCsv([HEADER, ...rows]));
}

/** 人の判定（課題ID:候補ID → "0"・"1"・"2"） */
export function readHuman(path = JUDGMENTS): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of readJudgments(path)) if (r[COL.human]) m.set(`${r[COL.qid]}:${r[COL.id]}`, r[COL.human]);
  return m;
}
