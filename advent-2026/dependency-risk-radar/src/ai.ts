// Claude に任せる2つ：
// ① 上位の脆弱性について「なぜこの順番か」を、コードが出した根拠だけで説明する
// ② 放置・非推奨の依存について乗り換え先を提案する（エージェント：deps.dev を調べる道具を使って確かめさせる）
// どちらの結果もコードで照合する。
import { betaZodTool, checkNumbers, generateObject, ignoreYears, runAgent } from "@advent/ai";
import { z } from "zod";
import { problemsOf } from "./health.js";
import { getPackageInfo } from "./sources/depsdev.js";
import type { Ecosystem, Finding, PackageHealth } from "./types.js";

// ---------- ① 順番の説明 ----------

const EXPLAIN_SYSTEM = `あなたはセキュリティエンジニアです。依存ライブラリの脆弱性を「今日対応すべき順」に並べた表があり、順番はすでにコードが決めています。あなたの役割は、開発者向けに「なぜこの順番か」を日本語で短く説明することです。

守ること：
- 根拠は、渡された事実（KEV・EPSS・深刻度・修正版・依存の種類）だけ。渡されていない脆弱性の内容や攻撃手法をあなたの知識で補わない。
- 数字（EPSS の確率や上位何%、CVSS、日付）は、渡された値をそのまま書く。計算し直したり、丸めたりしない。
- 順番を変えたり、異議を唱えたりしない。
- 各項目の説明は1〜2文。「何をすればよいか（修正版に上げる、など）」を最後に書く。
- overview には、全体で何件あり、そのうち急ぐのは何件か、という状況を2〜3文で書く（件数は渡された値を使う）。`;

const ExplainSchema = z.object({
  overview: z.string(),
  items: z.array(z.object({ id: z.string().describe("脆弱性のID（渡されたものをそのまま）"), reason: z.string() })),
});

function factsOf(f: Finding) {
  return {
    rank: f.priority.rank,
    id: f.vuln.id,
    cves: f.vuln.cves,
    package: `${f.dep.name}@${f.dep.version}`,
    summary: f.vuln.summary,
    urgent: f.priority.urgent,
    reasons: f.priority.reasons,
  };
}

/** 照合の前に、バージョン番号・CVE番号・日付など「数」ではない数字の並びを取り除く */
function stripIdentifiers(text: string): string {
  return text
    .replace(/\b(?:CVE|GHSA|PYSEC)-[\w-]+/g, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/@?\bv?\d+(?:\.\d+){2,}[\w.+-]*/g, " ");
}

export interface ExplainResult {
  overview: string;
  reasons: Map<string, string>;
  /** 渡した事実にない数字（照合で見つかったもの） */
  unmatchedNumbers: string[];
}

export async function explainPriorities(top: Finding[], totals: { vulns: number; urgent: number; deps: number }): Promise<ExplainResult> {
  const facts = top.map(factsOf);
  const out = await generateObject({
    label: "dependency-risk-radar/explain",
    system: EXPLAIN_SYSTEM,
    prompt: `全体：依存 ${totals.deps} 個、脆弱性 ${totals.vulns} 件、うち今日対応すべき ${totals.urgent} 件。\n上位 ${top.length} 件の事実（JSON）：\n${JSON.stringify(facts, null, 2)}`,
    schema: ExplainSchema,
  });

  // 照合してよい数字：事実の文章に出てくる数字と、件数
  const allowed = [
    totals.vulns,
    totals.urgent,
    totals.deps,
    top.length,
    ...facts.flatMap((f) => [f.rank, ...f.reasons.flatMap((r) => numbersIn(stripIdentifiers(r)))]),
  ];
  const texts = [out.overview, ...out.items.map((i) => i.reason)];
  const unmatched = texts.flatMap(
    (t) =>
      checkNumbers(stripIdentifiers(t), allowed, {
        ignore: (n) => ignoreYears(n) || (Number.isInteger(n.value) && Math.abs(n.value) <= 10 && !n.percent),
      }).unmatched.map((n) => n.raw),
  );
  return {
    overview: out.overview,
    reasons: new Map(out.items.map((i) => [i.id, i.reason])),
    unmatchedNumbers: [...new Set(unmatched)],
  };
}

function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

// ---------- ② 乗り換え先の提案（エージェント） ----------

const ALT_SYSTEM = `あなたはソフトウェアの依存関係に詳しいエンジニアです。放置または非推奨になっている依存ライブラリについて、乗り換え先を提案します。

進め方：
1. 候補を考えたら、必ず lookup_package で1つずつ調べ、実在すること、非推奨でないこと、最近も更新されていることを確かめる。調べていないパッケージは提案しない。
2. 同じエコシステム（npm なら npm、PyPI なら PyPI）の中から選ぶ。
3. 各依存につき候補は最大2つ。理由は1文で、何が違うか（標準機能で足りる、後継である、など）を書く。
4. 言語やランタイムの標準機能で置き換えられる場合（例：Node.js 18 以降の組み込みの fetch）は、builtin にそれを書く。標準機能は lookup_package で調べなくてよい。
5. 「長く更新されていないが、小さく安定していて乗り換える必要がない」ものは、alternatives を空にして keep_reason に理由を書く。
6. 最後に submit_alternatives を1回だけ呼んで結果を提出する。日本語で書く。`;

const SubmitSchema = z.object({
  items: z.array(
    z.object({
      package: z.string().describe("問題のある依存の名前（渡されたものをそのまま）"),
      alternatives: z.array(z.object({ name: z.string(), why: z.string() })).max(2),
      builtin: z.string().optional().describe("標準機能で置き換えられる場合、その機能と理由"),
      keep_reason: z.string().optional().describe("乗り換え不要と判断した場合の理由"),
    }),
  ),
});
export type AlternativesSubmission = z.infer<typeof SubmitSchema>;

export interface Alternative {
  name: string;
  why: string;
  /** コードで確かめた結果。問題がなければ空 */
  verifyProblems: string[];
  latestVersion: string | null;
  latestPublished: string | null;
}

export interface AlternativesResult {
  items: { package: string; alternatives: Alternative[]; builtin: string | null; keepReason: string | null }[];
  lookups: number;
  turns: number;
}

export async function suggestAlternatives(problems: PackageHealth[], now = new Date()): Promise<AlternativesResult> {
  let submitted: AlternativesSubmission | null = null;
  let lookups = 0;
  const lookup = betaZodTool({
    name: "lookup_package",
    description:
      "deps.dev でパッケージを調べる。実在するか、最新版と公開日、非推奨か、GitHub のスター数、OpenSSF Scorecard の Maintained（0〜10）を返す",
    inputSchema: z.object({ ecosystem: z.enum(["npm", "PyPI"]), name: z.string() }),
    run: async ({ ecosystem, name }) => {
      lookups++;
      const info = await getPackageInfo(ecosystem as Ecosystem, name);
      return JSON.stringify(info);
    },
  });
  const submit = betaZodTool({
    name: "submit_alternatives",
    description: "乗り換え先の提案を提出する。最後に1回だけ呼ぶ",
    inputSchema: SubmitSchema,
    run: async (input) => {
      submitted = input;
      return "受け付けました。これで終わりです。";
    },
  });

  const list = problems.map((h) => `- ${h.dep.ecosystem} / ${h.dep.name}@${h.dep.version}：${h.problems.join("、")}`).join("\n");
  const { turns } = await runAgent({
    label: "dependency-risk-radar/alternatives",
    system: ALT_SYSTEM,
    prompt: `次の依存について、乗り換え先を調べて提案してください。\n${list}`,
    tools: [lookup, submit],
    maxIterations: 12,
  });

  const result = submitted as AlternativesSubmission | null;
  if (!result) return { items: [], lookups, turns };

  // AI が提案したパッケージを、コードでもう一度確かめる
  const items = await Promise.all(
    result.items.map(async (item) => ({
      package: item.package,
      builtin: item.builtin ?? null,
      keepReason: item.keep_reason ?? null,
      alternatives: await Promise.all(
        item.alternatives.map(async (alt): Promise<Alternative> => {
          const eco = problems.find((p) => p.dep.name === item.package)?.dep.ecosystem ?? "npm";
          const info = await getPackageInfo(eco, alt.name);
          return {
            name: alt.name,
            why: alt.why,
            verifyProblems: problemsOf(info, now),
            latestVersion: info.latestVersion,
            latestPublished: info.latestPublished,
          };
        }),
      ),
    })),
  );
  return { items, lookups, turns };
}
