// 評価の抜き取り確認（手元専用）。Claude の判定は、自分で判定したあとに見せる（先に見ると引っ張られるので）
import "./style.css";

interface Item {
  qid: string;
  problem: string;
  kind: string;
  id: string;
  title: string;
  text: string;
  url: string;
  claude: string;
  reason: string;
  human: string;
}

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const LABEL: Record<string, string> = { "0": "関係ない", "1": "一部に使える", "2": "直接使えそう" };
const SHORT = 420;

const { items } = (await fetch("/dev/review").then((r) => r.json())) as { items: Item[] };
let i = Math.max(0, items.findIndex((x) => !x.human));
if (items.every((x) => x.human)) i = items.length;
let expanded = false;

function progress() {
  const n = items.filter((x) => x.human).length;
  $("count").textContent = `${n} / ${items.length} 件`;
  ($("bar") as HTMLElement).style.width = `${(n / items.length) * 100}%`;
}

function show() {
  progress();
  if (i >= items.length) {
    $("card").hidden = true;
    const done = items.filter((x) => x.human);
    const exact = done.filter((x) => x.human === x.claude).length;
    const rel = done.filter((x) => (Number(x.human) >= 1) === (Number(x.claude) >= 1)).length;
    $("summary").textContent = `${done.length}件のうち、Claude と点数がぴったり一致 ${exact}件、「関係ありか」が一致 ${rel}件でした。`;
    $("done").hidden = false;
    return;
  }
  $("done").hidden = true;
  const it = items[i];
  $("qid").textContent = `${it.qid}（${i + 1}件目）`;
  $("problem").textContent = it.problem;
  $("kind").textContent = it.kind;
  $("kind").className = `badge ${it.kind === "特許" ? "b-patent" : "b-report"}`;
  const a = $("title") as HTMLAnchorElement;
  a.textContent = it.title;
  a.href = it.url;
  $("cid").textContent = it.id;
  $("text").textContent = expanded || it.text.length <= SHORT ? it.text : `${it.text.slice(0, SHORT)}…`;
  $("more").hidden = expanded || it.text.length <= SHORT;
  document.querySelectorAll<HTMLButtonElement>(".rv-buttons button").forEach((b) => b.classList.toggle("on", b.dataset.v === it.human));
  $("card").hidden = false;
}

async function judge(v: string) {
  const it = items[i];
  if (!it) return;
  await fetch("/dev/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qid: it.qid, id: it.id, human: v }) });
  it.human = v;
  // 判定したあとで、Claude の判定を見せる
  const same = v === it.claude;
  $("prev").innerHTML = `<b>前の件</b>（${it.id}）：あなた <b>${v}</b>（${LABEL[v]}）／ Claude <b>${it.claude}</b>（${LABEL[it.claude]}）${same ? ' <span class="ok">一致</span>' : ' <span class="warn">ちがう</span>'}<br><span class="muted">Claude の理由：${it.reason.replace(/</g, "&lt;")}</span>`;
  $("prev").hidden = false;
  expanded = false;
  i++;
  show();
}

document.querySelectorAll<HTMLButtonElement>(".rv-buttons button").forEach((b) => (b.onclick = () => judge(b.dataset.v!)));
$("more").onclick = () => {
  expanded = true;
  show();
};
$("restart").onclick = () => {
  i = 0;
  show();
};
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (["0", "1", "2"].includes(e.key)) judge(e.key);
  else if (e.key === "ArrowRight" && i < items.length) {
    i++;
    expanded = false;
    show();
  } else if (e.key === "ArrowLeft" && i > 0) {
    i--;
    expanded = false;
    show();
  }
});
show();
