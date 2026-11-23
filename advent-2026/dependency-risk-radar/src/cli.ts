#!/usr/bin/env node
// 使い方:
//   dependency-risk-radar <package-lock.json|requirements.txt> [--top 10] [--no-ai] [--out report.md] [--json] [--fail-on kev|urgent|none]
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parseArgs } from "node:util";
import { analyze } from "./analyze.js";
import { parseDependencyFile } from "./parse.js";
import { renderReport } from "./report.js";

const HELP = `依存ライブラリの脆弱性を「今日対応すべき順」に並べるレポートを作ります。

使い方: dependency-risk-radar <package-lock.json か requirements.txt> [オプション]

  --top <数>        説明する上位の件数（既定 10）
  --no-ai           AI の説明と乗り換え先の提案を使わない（ANTHROPIC_API_KEY がなくても動く）
  --out <ファイル>   レポート（Markdown）の書き出し先。省略すると画面に出す
  --json            Markdown ではなく JSON で出す
  --fail-on <条件>   kev（悪用確認済みがあれば）/ urgent（今日対応すべきがあれば）/ none（既定）で終了コード 1 にする
`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      top: { type: "string", default: "10" },
      "no-ai": { type: "boolean", default: false },
      out: { type: "string" },
      json: { type: "boolean", default: false },
      "fail-on": { type: "string", default: "none" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help || positionals.length !== 1) {
    process.stderr.write(HELP);
    process.exit(values.help ? 0 : 2);
  }
  const file = positionals[0];
  const top = Number(values.top);
  const failOn = values["fail-on"];
  if (!["kev", "urgent", "none"].includes(failOn!)) throw new Error("--fail-on は kev / urgent / none のどれかです");

  const { deps, skipped } = parseDependencyFile(basename(file), readFileSync(file, "utf8"));
  const result = await analyze(deps, skipped, {
    top,
    ai: !values["no-ai"],
    log: (m) => process.stderr.write(`${m}\n`),
  });

  const output = values.json
    ? JSON.stringify({ ...result, explain: result.explain && { ...result.explain, reasons: Object.fromEntries(result.explain.reasons) } }, null, 2)
    : renderReport(result, { top, fileName: basename(file) });
  if (values.out) {
    writeFileSync(values.out, output);
    process.stderr.write(`${values.out} に書き出しました\n`);
  } else process.stdout.write(`${output}\n`);

  const kev = result.findings.some((f) => f.kev);
  const urgent = result.findings.some((f) => f.priority.urgent);
  if ((failOn === "kev" && kev) || (failOn === "urgent" && urgent)) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`エラー: ${(err as Error).message}\n`);
  process.exit(2);
});
