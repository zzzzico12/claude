// CesiumJS の静的ファイル（Workers・Assets・Widgets・ThirdParty）を、開発サーバーでは /cesium/ で配り、
// ビルドでは dist/cesium/ に写す Vite のプラグイン。画面側では import の前に window.CESIUM_BASE_URL = "/cesium/" を設定する
import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

const DIRS = ["Workers", "ThirdParty", "Assets", "Widgets"];
const TYPES: Record<string, string> = {
  ".js": "text/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".ktx2": "image/ktx2",
};

/** root：cesium を依存に入れているアプリのフォルダ（その node_modules から探す） */
export function cesiumAssets(root = process.cwd()): Plugin {
  const require = createRequire(join(root, "package.json"));
  const base = join(dirname(require.resolve("cesium/package.json")), "Build", "Cesium");
  let config: ResolvedConfig;
  return {
    name: "advent-cesium-assets",
    configResolved(c) {
      config = c;
    },
    configureServer(server) {
      server.middlewares.use("/cesium", (req, res, next) => {
        const path = normalize(join(base, decodeURIComponent((req.url ?? "").split("?")[0])));
        if (!path.startsWith(base) || !existsSync(path) || !statSync(path).isFile()) return next();
        res.setHeader("Content-Type", TYPES[extname(path)] ?? "application/octet-stream");
        createReadStream(path).pipe(res);
      });
    },
    closeBundle() {
      if (config.command !== "build") return;
      for (const d of DIRS) cpSync(join(base, d), join(config.build.outDir, "cesium", d), { recursive: true });
    },
  };
}
