// 手元の開発用：Vite の開発サーバーで /api/<名前> を api/<名前>.ts として動かす（本番は Vercel Functions）。
// .env はサーバー側（process.env）にだけ読み込み、画面のコードには埋め込まない。
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

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, "..", ""));
  return { plugins: [devApi()] };
});
