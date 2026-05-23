import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, "..");

function readScrapeSessionAbsolute(): string | null {
  const metaPath = path.join(webRoot, "public", "scrape-session.json");
  if (!fs.existsSync(metaPath)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as {
      sessionDirRelative?: string;
      sessionFolderName?: string;
    };
    const folder = meta.sessionDirRelative ?? meta.sessionFolderName;
    if (folder) {
      const p = path.join(repoRoot, "out", folder);
      if (fs.existsSync(p)) return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function scrapeAssetsPlugin(): Plugin {
  const sessionDir = readScrapeSessionAbsolute();
  const base = process.env.VITE_BASE_PATH ?? "/pppad/";
  const prefix = `${base.replace(/\/$/, "")}/scrape-assets/`;

  return {
    name: "scrape-assets",
    configureServer(server) {
      if (!sessionDir) {
        console.warn("[scrape-assets] No DOM session — run npm run build:scrape from repo root.");
        return;
      }
      console.log(`[scrape-assets] Serving HTML from ${sessionDir}`);

      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith(prefix)) return next();

        const rel = decodeURIComponent(url.slice(prefix.length).split("?")[0] ?? "");
        if (!rel || rel.includes("..")) {
          res.statusCode = 400;
          res.end("Bad path");
          return;
        }

        const filePath = path.join(sessionDir, rel);
        if (!filePath.startsWith(sessionDir) || !fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const types: Record<string, string> = {
          ".html": "text/html; charset=utf-8",
          ".json": "application/json",
          ".txt": "text/plain; charset=utf-8",
        };
        res.setHeader("Content-Type", types[ext] ?? "application/octet-stream");
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), scrapeAssetsPlugin()],
  base: process.env.VITE_BASE_PATH ?? "/pppad/",
  resolve: {
    alias: {
      "@": path.resolve(webRoot, "./src"),
    },
  },
});
