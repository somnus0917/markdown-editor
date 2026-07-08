import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  createReadStream,
  cpSync,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Connect } from "vite";

const host = process.env.TAURI_DEV_HOST;
const require = createRequire(import.meta.url);
const mathJaxDir = path.dirname(require.resolve("mathjax/tex-svg-nofont.js"));
const mathJaxFontDir = path.dirname(
  require.resolve("@mathjax/mathjax-newcm-font/package.json"),
);
const sreLabShim = "export {};\n";

function mathJaxStaticAssets() {
  return {
    name: "mathjax-static-assets",
    configureServer(server) {
      server.middlewares.use("/mathjax", serveStaticDirectory(mathJaxDir));
      server.middlewares.use(
        "/mathjax-fonts/mathjax-newcm-font",
        serveStaticDirectory(mathJaxFontDir),
      );
    },
    writeBundle() {
      const distMathJaxDir = path.resolve("dist/mathjax");
      cpSync(mathJaxDir, distMathJaxDir, {
        recursive: true,
      });
      writeSreLabShim(distMathJaxDir);
      cpSync(
        mathJaxFontDir,
        path.resolve("dist/mathjax-fonts/mathjax-newcm-font"),
        {
          recursive: true,
        },
      );
    },
  };
}

function serveStaticDirectory(rootDir: string): Connect.HandleFunction {
  return (request, response, next) => {
    const rawUrl = request.url?.split("?")[0] ?? "";
    const relativePath = safeDecodeURIComponent(rawUrl).replace(/^\/+/, "");
    const filePath = path.resolve(rootDir, relativePath);

    if (!filePath.startsWith(rootDir)) {
      response.statusCode = 403;
      response.end("Forbidden");
      return;
    }

    if (relativePath === "sre/sre-lab.js") {
      response.setHeader("Content-Type", "text/javascript; charset=utf-8");
      response.end(sreLabShim);
      return;
    }

    if (!existsSync(filePath)) {
      next();
      return;
    }

    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      next();
      return;
    }

    mkdirSync(path.resolve("dist"), { recursive: true });
    response.setHeader("Content-Type", contentTypeFor(filePath));
    createReadStream(filePath).pipe(response);
  };
}

function writeSreLabShim(rootDir: string): void {
  const shimPath = path.resolve(rootDir, "sre/sre-lab.js");
  mkdirSync(path.dirname(shimPath), { recursive: true });
  writeFileSync(shimPath, sreLabShim);
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function contentTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".woff2":
      return "font/woff2";
    case ".css":
      return "text/css; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), mathJaxStaticAssets()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
