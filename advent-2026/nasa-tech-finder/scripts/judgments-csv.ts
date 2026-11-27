// eval/judgments.csv の読み書き
// 列：課題ID, 課題, 種類, ID, 題名, Claude の判定, 理由, 抜き取り, 再確認の判定, 再確認の理由
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const JUDGMENTS = "eval/judgments.csv";
export const HEADER = ["課題ID", "課題", "種類", "ID", "題名", "Claude の判定", "理由", "抜き取り", "再確認の判定（別のモデル）", "再確認の理由"];
export const COL = { qid: 0, problem: 1, kind: 2, id: 3, title: 4, claude: 5, reason: 6, sample: 7, recheck: 8, recheckReason: 9 } as const;

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
