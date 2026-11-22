// 手元の開発用：Vite の開発サーバーで /api/survey も動かす（本番は Vercel Functions が api/ を動かす）。
// .env はサーバー側（process.env）にだけ読み込み、画面のコードには埋め込まない。
import { Readable } from "node:stream";
import { defineConfig, loadEnv, type Plugin } from "vite";

function devApi(): Plugin {
  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use("/api/survey", async (req, res) => {
        const mod = await server.ssrLoadModule("/api/survey.ts");
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const request = new Request(`http://localhost${req.url ?? ""}`, {
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

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, "../..", ""));
  return { plugins: [devApi()] };
});
