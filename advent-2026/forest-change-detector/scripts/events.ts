// 「その年に何があったか」：大陸ごとに目立つ年をコードで選び、Claude がウェブ検索で確かめながら説明する（事前に1回）
//   pnpm events      （先に uv run python scripts/fetch_stats.py を実行しておく）
// - 年の選び方（コード）：減少が最も多かった年と、前の年から最も増えた年
// - 数字（コード）：減少面積、前の年からの増え方、火災の割合、原生林の割合、主な原因、多かった国
// - 説明（AI）：ウェブ検索の結果だけを根拠に。出典（URL）を一緒に保存する
// - 照合：説明の数字は、コードの数字か、引用した検索結果の文に出てくるものだけを許す
import { checkNumbers, estimateCostUsd, extractNumbers, getClient, ignoreYears, resolveModel } from "@advent/ai";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const stats = JSON.parse(readFileSync(join(appDir, "public", "data", "stats.json"), "utf8"));
const cy = JSON.parse(readFileSync(join(appDir, "data", "country_year.json"), "utf8"));
const years: number[] = stats.years;

const man = (ha: number) => Math.round(ha / 10_000); // 万ha
const pct = (x: number) => Math.round(x * 100);

export interface EventFacts {
  group: string;
  groupName: string;
  year: number;
  kind: "最も多かった年" | "前の年から最も増えた年";
  loss_man_ha: number;
  prev_loss_man_ha: number;
  change_pct: number;
  /** 前の年の何倍か（AI に計算させないよう、コードで出しておく） */
  ratio_to_prev: number;
  fire_share_pct: number;
  primary_share_pct: number;
  drivers: { name: string; share_pct: number }[];
  countries: { name: string; loss_man_ha: number; change_pct: number | null }[];
}

function pickEvents(): EventFacts[] {
  const out: EventFacts[] = [];
  for (const [key, g] of Object.entries<any>(stats.groups)) {
    const loss: number[] = g.loss;
    const peak = loss.indexOf(Math.max(...loss));
    const jumps = loss.map((v, i) => (i === 0 ? -Infinity : v - loss[i - 1]));
    const order = jumps.map((_, i) => i).sort((a, b) => jumps[b] - jumps[a]);
    const jump = order.find((i) => i !== peak)!;
    for (const [i, kind] of [
      [peak, "最も多かった年"],
      [jump, "前の年から最も増えた年"],
    ] as const) {
      const total = loss[i];
      const drivers = Object.entries<number[]>(g.drivers)
        .map(([name, v]) => ({ name, share_pct: pct(v[i] / total) }))
        .filter((d) => d.share_pct >= 5)
        .sort((a, b) => b.share_pct - a.share_pct);
      const countries = Object.values<any>(cy.countries)
        .filter((c) => c.group === key)
        .sort((a, b) => b.loss[i] - a.loss[i])
        .slice(0, 3)
        .map((c) => ({
          name: c.name as string,
          loss_man_ha: man(c.loss[i]),
          change_pct: i > 0 && c.loss[i - 1] > 0 ? pct(c.loss[i] / c.loss[i - 1] - 1) : null,
        }));
      out.push({
        group: key,
        groupName: g.name,
        year: years[i],
        kind,
        loss_man_ha: man(total),
        prev_loss_man_ha: i > 0 ? man(loss[i - 1]) : 0,
        change_pct: i > 0 ? pct(total / loss[i - 1] - 1) : 0,
        ratio_to_prev: i > 0 ? Math.round((total / loss[i - 1]) * 10) / 10 : 0,
        fire_share_pct: pct(g.fire[i] / total),
        primary_share_pct: pct(g.primary[i] / total),
        drivers,
        countries,
      });
    }
  }
  return out;
}

const SYSTEM = `あなたは森林と環境のニュースに詳しい研究者です。ある地域で、ある年に森が大きく減った理由を、一般の読者向けに日本語で説明します。

数字（減少面積、前の年からの増え方、火災の割合、原因、国）は、衛星データからコードが計算したものです。あなたの役割は、その年にその地域で何が起きたかを、ウェブ検索で確かめて説明することです。

守ること：
- 必ず web_search で調べ、検索結果に書かれていることだけを根拠にする。検索で確かめられないことは書かない
- 渡された数字は書き換えない。比率や倍率、合計などを自分で計算しない（必要な比率は渡した数字に入っている）
- 検索結果の数字を使うときは、その検索結果から引用し、出典の書き方のまま書く（単位の換算をしない。英語の "1.13 million hectares" は「113万ha」ではなく「1.13 million ha（約113万ha）」のようにする）
- 3〜4文、200字程度。何が起きたか（例：大規模な山火事、干ばつ、農地の拡大）と、それが数字のどこに表れているか（火災の割合など）を書く
- 断定できないことは「〜とされる」「〜が報じられた」と書く`;

interface Citation {
  url: string;
  title: string;
  cited_text: string;
}

async function explain(f: EventFacts) {
  const client = getClient();
  const model = resolveModel();
  const messages: any[] = [
    {
      role: "user",
      content: `地域：${f.groupName}\n年：${f.year}年（${f.kind}）\n衛星データからコードが計算した数字（JSON）：\n${JSON.stringify(f, null, 1)}\n\nこの年、この地域で森が大きく減った理由を調べて説明してください。`,
    },
  ];
  let text = "";
  const citations: Citation[] = [];
  let searches = 0;
  let cost = 0;
  // 検索が長くなると pause_turn で一度止まるので、続きを頼む
  for (let turn = 0; turn < 4; turn++) {
    const res = await client.messages.create({
      model,
      max_tokens: 4000,
      system: SYSTEM,
      // 新しい web_search_20260209 は、結果を裏でコードで絞り込む仕組みのため、文章に出典（citations）が付かず、
      // 出典を本文に書き込むだけだった（2026-11-23 に確認）。出典の URL と引用した文を照合に使いたいので、基本の版を使う
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      output_config: { effort: "low" },
      messages,
    });
    const u = res.usage;
    cost +=
      (estimateCostUsd(res.model, {
        inputTokens: u.input_tokens,
        outputTokens: u.output_tokens,
        cacheReadTokens: u.cache_read_input_tokens ?? 0,
        cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
      }) ?? 0) + (u.server_tool_use?.web_search_requests ?? 0) * 0.01;
    searches += u.server_tool_use?.web_search_requests ?? 0;
    for (const b of res.content) {
      if (b.type !== "text") continue;
      text += b.text;
      for (const c of b.citations ?? []) {
        if (c.type === "web_search_result_location" && !citations.some((x) => x.url === c.url && x.cited_text === c.cited_text)) {
          citations.push({ url: c.url, title: c.title ?? c.url, cited_text: c.cited_text });
        }
      }
    }
    if (res.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: res.content });
  }
  // 照合してよい数字：コードの数字と、引用した検索結果の文に出てくる数字
  // 面積は「万ha」の単位で渡しているので、AI が「757万ha」と書けば 7,570,000 として読まれる。10,000倍の値も許す
  const factNumbers = (JSON.stringify(f).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const allowed = [
    ...factNumbers,
    ...factNumbers.map((n) => n * 10_000),
    ...citations.flatMap((c) => extractNumbers(c.cited_text).map((n) => n.value)),
  ];
  // 日付（「2019年12月」「2019〜20年」）は照合しない
  const stripDates = (t: string) =>
    t
      .replace(/\d{4}\s*[〜～\-–]\s*\d{2,4}\s*年/g, " ")
      .replace(/(\d{4}年)?\d{1,2}月(\d{1,2}日)?/g, " ")
      .replace(/\d{4}年/g, " ");
  const unmatched = checkNumbers(stripDates(text), [...allowed, ...allowed.map(Math.abs)], {
    ignore: (n) => ignoreYears(n) || (Number.isInteger(n.value) && Math.abs(n.value) <= 10 && !n.percent),
  }).unmatched.map((n) => n.raw);
  return { text: text.trim(), citations, unmatchedNumbers: unmatched, searches, costUsd: Math.round(cost * 1000) / 1000 };
}

async function main() {
  const events = pickEvents();
  const out = [];
  let total = 0;
  for (const f of events) {
    const r = await explain(f);
    total += r.costUsd;
    out.push({ ...f, ...r });
    process.stderr.write(
      `${f.groupName} ${f.year}（${f.kind}） 検索${r.searches}回・出典${new Set(r.citations.map((c) => c.url)).size}件${r.unmatchedNumbers.length ? ` ⚠数字 ${r.unmatchedNumbers.join(",")}` : ""}\n`,
    );
  }
  writeFileSync(join(appDir, "public", "data", "events.json"), JSON.stringify(out, null, 1));
  process.stderr.write(`合計 約${total.toFixed(2)}ドル\n`);
}

main();
