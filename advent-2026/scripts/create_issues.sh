#!/usr/bin/env bash
# 25本分のIssueを一括作成する。事前に `gh auth login` し、advent-2026 フォルダの中で実行する（スクリプトの場所から自動で移動する）。
# 使い方: ./scripts/create_issues.sh        （実際に作成）
#         DRY_RUN=1 ./scripts/create_issues.sh（作成せずに表示だけ）
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${DRY_RUN:-}" ]; then
  gh label create advent-2026 --color 1D76DB --description "アドベントカレンダー2026の1日分" 2>/dev/null || true
fi

for readme in $(for f in apps/*/README.md; do n=$(head -n1 "$f" | sed -E 's/^# Day ([0-9]+).*/\1/'); echo "$n $f"; done | sort -n | cut -d" " -f2); do
  # 1行目 "# Day 01（12/1 火）論文サーベイの自動化" → "[Day01] 12/1 論文サーベイの自動化"
  first=$(head -n1 "$readme" | sed 's/^# //')
  num=$(echo "$first" | sed -E 's/^Day ([0-9]+).*/\1/')
  date=$(echo "$first" | sed -E 's/^Day [0-9]+（([0-9/]+) .*/\1/')
  name=$(echo "$first" | sed -E 's/^Day [0-9]+（[^）]*）//')
  app=$(basename "$(dirname "$readme")")
  title="[Day${num}] ${date} ${name}（${app}）"
  body=$(printf '仕様書: `advent-2026/%s`\n\n%s' "$readme" "$(tail -n +2 "$readme")")
  if [ -n "${DRY_RUN:-}" ]; then
    echo "$title"
  else
    if gh issue list --label advent-2026 --state all --search "\"[Day${num}]\" in:title" --json number --jq 'length' | grep -q '^0$'; then
      gh issue create --title "$title" --label advent-2026 --body "$body"
    else
      echo "skip (already exists): $title"
    fi
  fi
done
