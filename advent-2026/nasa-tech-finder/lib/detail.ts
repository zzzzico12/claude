// 1件を詳しく：AI による「詳しい解説」と「活用プラン」、コードで出す「使いたいときは」
// - 解説は特許の説明文・報告書の要約の全文だけをもとにする（書いていないことを足さない）。数字は照合する
// - 活用プランは、利用者の課題に当てはめる。事実ではなく「確かめること」「最初の一歩」として書かせる
// - ライセンスの種類や費用は AI に書かせず、NASA のページ（2026-11-28 に確認）の内容をコードで出す
import { checkNumbers, extractNumbers, generateObject, ignoreYears } from "@advent/ai";
import { z } from "zod";
import { allowedNumbers } from "./number-words.js";

export const DetailSchema = z.object({
  oneLine: z.string().describe("ひとことで言うと（日本語で1文）"),
  analogy: z.string().describe("身近なものにたとえた説明（日本語で1〜2文）"),
  howItWorks: z.array(z.string()).min(1).max(5).describe("仕組みを順に（日本語で1項目1文）"),
  whatsNew: z.string().describe("従来の方法と比べて新しい点（説明文に書いてある範囲で。日本語で1〜2文）"),
  everydayUses: z.array(z.string()).max(4).describe("身近な使い道の例（説明文に挙がっている用途を優先。挙がっていないものは「〜にも使えるかもしれない」と推測であることがわかる書き方で）"),
  limits: z.array(z.string()).max(4).describe("弱み・注意点（説明文から読み取れること、または「説明文には〜が書かれていない」）"),
  plan: z.object({
    fit: z.string().describe("利用者の課題にどう当てはめられそうか（日本語で2〜3文）"),
    questions: z.array(z.string()).min(1).max(5).describe("NASA や専門家に確かめること（性能・条件・実用化の段階など。日本語の疑問文）"),
    firstSteps: z.array(z.string()).min(1).max(4).describe("最初の一歩（調べる・試す・相談する、など具体的な行動。日本語で1項目1文）"),
  }),
});
export type Detail = z.infer<typeof DetailSchema>;

const SYSTEM = `あなたは、NASA の特許や技術報告書を、専門外の日本の人にやさしく解説する案内役です。
- 解説（oneLine・analogy・howItWorks・whatsNew・limits）は、渡された説明文に書いてあることだけをもとにする。書いていない性能・数字・実績を足さない
- 数字を書くときは説明文にある数字をそのまま使う（英語の数は数字に直してよい）
- everydayUses は、説明文に挙がっている用途を優先する。挙がっていない用途は「〜にも使えるかもしれません」のように推測とわかる書き方にする
- plan は利用者の課題に当てはめる。断定せず、確かめるべきことは questions に、行動は firstSteps に書く。ライセンスの費用や手続きの細かい条件は書かない（画面に別に出す）
- 専門用語には短い言い換えを添える。やさしい日本語で`;

export interface DetailInput {
  problem: string;
  kind: "patent" | "report";
  id: string;
  title: string;
  text: string;
}

export async function explainDetail(x: DetailInput): Promise<{ detail: Detail; unmatchedNumbers: string[] }> {
  const detail = await generateObject({
    label: "nasa-tech-finder/detail",
    system: SYSTEM,
    prompt: `利用者の課題：${x.problem.slice(0, 500)}\n\n${x.kind === "patent" ? "特許" : "技術報告書"}（${x.id}）\n題名：${x.title}\n説明文：\n${x.text.slice(0, 6000)}`,
    schema: DetailSchema,
    maxTokens: 4000,
  });
  return { detail, unmatchedNumbers: checkDetailNumbers(detail, x) };
}

/** 解説の数字が、説明文・題名・課題にあるかを照合する（年号と10以下の整数は除く） */
export function checkDetailNumbers(d: Detail, x: Pick<DetailInput, "problem" | "id" | "title" | "text">): string[] {
  const allowed = allowedNumbers([x.problem, x.id, x.title, x.text], (t) => extractNumbers(t).map((n) => n.value));
  const text = [d.oneLine, d.analogy, ...d.howItWorks, d.whatsNew, ...d.everydayUses, ...d.limits, d.plan.fit, ...d.plan.questions, ...d.plan.firstSteps].join("\n");
  return checkNumbers(text, allowed, { ignore: (n) => ignoreYears(n) || (Number.isInteger(n.value) && Math.abs(n.value) <= 10) }).unmatched.map((n) => n.raw);
}

/** 使いたいときは（NASA のページの内容をコードで出す。AI には書かせない） */
export function nextSteps(kind: "patent" | "report", id: string, pdfUrl: string | null = null) {
  if (kind === "patent") {
    const e = encodeURIComponent(id);
    return {
      links: [
        { label: "この特許について NASA に質問する（Ask a Question）", url: `https://technology.nasa.gov/contact-us/${e}` },
        { label: "ライセンスを申し込む（Apply to License）", url: `https://technology.nasa.gov/session/?topid=${e}` },
        { label: "紹介ページを PDF で保存", url: `https://technology.nasa.gov/t2media/tops/pdf/${e}.pdf` },
        { label: "ライセンスの流れ（How to License）", url: "https://technology.nasa.gov/license" },
      ],
      notes: [
        "評価ライセンス：試すためのもの（販売はできない）。標準は12か月・2,500ドル",
        "商用ライセンス：最初に払う額（非独占なら5,000〜10,000ドルが多い）と、毎年の最低額、売上の3〜7%程度",
        "スタートアップ向け（最初の支払いなし）は米国の会社だけ。海外の会社は審査に6〜8週間ほど余分にかかる",
        "出典：NASA「Licensing NASA Technology」（2026-11-28 に確認）。条件は変わることがあるので、申し込む前に NASA のページで確かめる",
      ],
    };
  }
  return {
    links: [
      { label: "NTRS で報告書を読む", url: `https://ntrs.nasa.gov/citations/${id}` },
      ...(pdfUrl ? [{ label: "本文の PDF", url: pdfUrl }] : []),
    ],
    notes: ["技術報告書は無料で読める。報告書の技術が特許になっているかは、NASA の特許の一覧（T2 ポータル）で調べる"],
  };
}
