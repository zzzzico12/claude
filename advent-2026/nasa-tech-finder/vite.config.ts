// 手元の開発用：Vite の開発サーバーで /api/<名前> を api/<名前>.ts として動かす（本番は Vercel Functions）。
// .env はサーバー側（process.env）にだけ読み込み、画面のコードには埋め込まない。
import { existsSync, readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { defineConfig, loadEnv, type Plugin } from "vite";

function devApi(): Plugin {
  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use("/api", async (req, res) => {
        const name = (req.url ?? "").split("?")[0].replace(/^\//, "");
        if (!/^[a-z-]+$/.test(name)) {
          res.statusCode = 404;
          return res.end();
        }
        const mod = await server.ssrLoadModule(`/api/${name}.ts`);
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const request = new Request(`http://localhost/api${req.url ?? ""}`, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
        });
        const handler = mod[req.method ?? "GET"];
        const response: Response = handler ? await handler(request) : new Response("Method Not Allowed", { status: 405 });
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        if (response.body) Readable.fromWeb(response.body as never).pipe(res);
        else res.end();
      });
    },
  };
}

/**
 * 評価の抜き取り確認用（手元の開発サーバーだけ。本番のビルドには入らない）
 * GET  /dev/review：抜き取りの候補（課題・題名・説明文・Claude の判定・人の判定）
 * POST /dev/review：{ qid, id, human: "0" | "1" | "2" | "" } を eval/judgments.csv に書く
 */
function devReview(): Plugin {
  return {
    name: "dev-review",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/dev/review", async (req, res) => {
        const { COL, readJudgments, writeJudgments } = await import("./scripts/judgments-csv.js");
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(body));
        };
        const rows = readJudgments();
        if (req.method === "GET") {
          // 説明文は評価の実行結果（data/eval-run.json）から引く
          const run = existsSync("data/eval-run.json") ? (JSON.parse(readFileSync("data/eval-run.json", "utf8")) as { q: { id: string }; items: { id: string; text: string }[] }[]) : [];
          const text = new Map(run.flatMap((r) => r.items.map((it) => [`${r.q.id}:${it.id}`, it.text] as const)));
          const items = rows
            .filter((r) => r[COL.sample] === "○")
            .map((r) => ({
              qid: r[COL.qid],
              problem: r[COL.problem],
              kind: r[COL.kind],
              id: r[COL.id],
              title: r[COL.title],
              text: text.get(`${r[COL.qid]}:${r[COL.id]}`) ?? "",
              url: r[COL.kind] === "特許" ? `https://technology.nasa.gov/patent/${encodeURIComponent(r[COL.id])}` : `https://ntrs.nasa.gov/citations/${r[COL.id]}`,
              claude: r[COL.claude],
              reason: r[COL.reason],
              human: r[COL.human],
            }));
          return send(200, { items });
        }
        if (req.method === "POST") {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const b = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { qid: string; id: string; human: string };
          if (!["0", "1", "2", ""].includes(b.human)) return send(400, { error: "human は 0・1・2 か空" });
          const row = rows.find((r) => r[COL.qid] === b.qid && r[COL.id] === b.id);
          if (!row) return send(404, { error: "見つかりません" });
          row[COL.human] = b.human;
          writeJudgments(rows);
          return send(200, { ok: true });
        }
        send(405, { error: "GET か POST" });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, "..", ""));
  return { plugins: [devApi(), devReview()] };
});
