#!/usr/bin/env node
/**
 * Merges latest DOM HTML scrape + walk scrape into web/public/unified-scrape.json
 * and copies text assets (content.txt, linked-docs) for static hosting.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out");
const webPublic = join(root, "web", "public");

const QUALITY_SCORE = {
  rich: 4,
  "placeholder-only": 1,
  "viewer-shell": 0,
  minimal: 0,
};

function latestDomSessionDir() {
  const dirs = readdirSync(outDir)
    .filter((f) => f.startsWith("pebblepad-dom-") && !f.endsWith(".zip"))
    .map((f) => ({ f, m: statSync(join(outDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!dirs.length) return null;
  return join(outDir, dirs[0].f);
}

function latestWalkJson() {
  const files = readdirSync(outDir)
    .filter((f) => f.startsWith("pebblepad-walk-") && f.endsWith(".json"))
    .map((f) => ({ f, m: statSync(join(outDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!files.length) return null;
  return join(outDir, files[0].f);
}

function normalizePageName(name) {
  return name
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPageNameFromContent(content) {
  const loaded = content.match(/(?:^|\n)i?\n?(.+?) from .+ has loaded/im);
  if (loaded?.[1]) return loaded[1].trim();

  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 20)) {
    if (line.length < 3 || line.length > 90) continue;
    if (/^(PebblePad|Pebble\+|Skip|ATLAS|Save|Preview|Close|Induction)$/i.test(line)) continue;
    if (/has loaded|Enter a title/i.test(line)) continue;
    return line;
  }
  return null;
}

function excerpt(text, max = 600) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function pageIdFromUrl(url) {
  try {
    return new URL(url).hash.match(/pageId=([^&]+)/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

function enrichCapture(sessionDir, cap) {
  const base = join(sessionDir, dirname(cap.contentPath));
  const contentPath = join(sessionDir, cap.contentPath);
  let content = "";
  if (existsSync(contentPath)) {
    content = readFileSync(contentPath, "utf8");
  }

  const pageName = extractPageNameFromContent(content) ?? cap.title;
  const pageId = pageIdFromUrl(cap.url);

  return {
    ...cap,
    pageName,
    pageNameNorm: normalizePageName(pageName),
    pageId,
    contentLength: content.length,
    contentPreview: excerpt(content, 1200),
    assetDir: dirname(cap.contentPath),
  };
}

function pickBetterCapture(a, b) {
  const qa = QUALITY_SCORE[a.captureQuality] ?? 0;
  const qb = QUALITY_SCORE[b.captureQuality] ?? 0;
  if (qb !== qa) return qb > qa ? b : a;
  const la = a.linkedDocuments?.length ?? 0;
  const lb = b.linkedDocuments?.length ?? 0;
  if (lb !== la) return lb > la ? b : a;
  if ((b.contentLength ?? 0) !== (a.contentLength ?? 0)) {
    return (b.contentLength ?? 0) > (a.contentLength ?? 0) ? b : a;
  }
  return b.index > a.index ? b : a;
}

function copyTextAssets(sessionDir, sessionFolderName, captures) {
  const destRoot = join(webPublic, "scrape", sessionFolderName);
  if (existsSync(destRoot)) rmSync(destRoot, { recursive: true, force: true });
  mkdirSync(destRoot, { recursive: true });

  for (const cap of captures) {
    const srcBase = join(sessionDir, cap.assetDir);
    const destBase = join(destRoot, cap.assetDir);
    mkdirSync(destBase, { recursive: true });

    const contentSrc = join(srcBase, "content.txt");
    if (existsSync(contentSrc)) {
      mkdirSync(dirname(destBase), { recursive: true });
      cpSync(contentSrc, join(destBase, "content.txt"));
    }

    const linkedSrc = join(srcBase, "linked-docs");
    if (existsSync(linkedSrc)) {
      cpSync(linkedSrc, join(destBase, "linked-docs"), { recursive: true });
    }
  }

  return `scrape/${sessionFolderName}`;
}

const sessionDir = latestDomSessionDir();
const walkPath = latestWalkJson();
const unifiedPath = join(webPublic, "unified-scrape.json");

if (!sessionDir) {
  if (existsSync(unifiedPath)) {
    try {
      const existing = JSON.parse(readFileSync(unifiedPath, "utf8"));
      if (existing.dom?.staticAssetsBase && Object.keys(existing.pagesByName ?? {}).length > 0) {
        console.warn(
          "No pebblepad-dom-* in out/ — keeping existing web/public/unified-scrape.json (CI-safe).",
        );
        process.exit(0);
      }
    } catch {
      /* fall through to empty write */
    }
  }
  console.warn("No pebblepad-dom-* session in out/ — writing empty unified index.");
  writeFileSync(
    unifiedPath,
    JSON.stringify({ dom: null, walk: null, pagesByName: {}, captures: [] }, null, 2),
  );
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(join(sessionDir, "manifest.json"), "utf8"));
const sessionFolderName = sessionDir.replace(`${outDir}/`, "");
const captures = (manifest.captures ?? []).map((c) => enrichCapture(sessionDir, c));

const byName = new Map();
for (const cap of captures) {
  const key = cap.pageNameNorm || `capture-${cap.index}`;
  const prev = byName.get(key);
  byName.set(key, prev ? pickBetterCapture(prev, cap) : cap);
}

let walk = null;
const walkPagesByName = new Map();
if (walkPath) {
  walk = JSON.parse(readFileSync(walkPath, "utf8"));
  for (const { snapshot, analysis } of walk.pages ?? []) {
    const text = snapshot?.visibleText ?? "";
    const re = /i\n(.+?) from .+ has loaded/g;
    let m;
    let name = null;
    while ((m = re.exec(text))) name = m[1].trim();
    if (!name) continue;
    walkPagesByName.set(normalizePageName(name), {
      name,
      url: snapshot.url,
      excerpt: excerpt(text, 480),
      detectedRequirements: analysis?.detectedRequirements ?? [],
      requiredWork: analysis?.requiredWork ?? [],
      unclear: analysis?.unclear ?? [],
    });
  }
}

const pagesByName = {};
for (const [norm, cap] of byName) {
  pagesByName[cap.pageName] = {
    pebblePage: cap.pageName,
    pageNameNorm: norm,
    dom: {
      index: cap.index,
      title: cap.title,
      url: cap.url,
      pageId: cap.pageId,
      captureQuality: cap.captureQuality,
      assetDir: cap.assetDir,
      contentLength: cap.contentLength,
      contentPreview: cap.contentPreview,
      linkedDocuments: cap.linkedDocuments ?? [],
    },
    walk: walkPagesByName.get(norm) ?? null,
  };
}

const staticBase = copyTextAssets(sessionDir, sessionFolderName, captures);

const meta = {
  sessionFolderName,
  sessionDirRelative: sessionFolderName,
};

writeFileSync(join(webPublic, "scrape-session.json"), `${JSON.stringify(meta, null, 2)}\n`);

const unified = {
  builtAt: new Date().toISOString(),
  dom: {
    sessionStamp: manifest.sessionStamp,
    sessionFolderName,
    captureCount: captures.length,
    uniquePageCount: byName.size,
    staticAssetsBase: staticBase,
  },
  walk: walk
    ? {
        generatedAt: walk.report?.generatedAtIso,
        sourceFile: walkPath.replace(`${root}/`, ""),
        pageCount: walkPagesByName.size,
      }
    : null,
  pagesByName,
  captures: captures.map((c) => ({
    index: c.index,
    pageName: c.pageName,
    title: c.title,
    url: c.url,
    captureQuality: c.captureQuality,
    assetDir: c.assetDir,
    linkedDocumentCount: c.linkedDocuments?.length ?? 0,
  })),
};

writeFileSync(join(webPublic, "unified-scrape.json"), `${JSON.stringify(unified, null, 2)}\n`);

console.log(
  `Unified scrape: ${captures.length} captures, ${byName.size} unique page names → web/public/unified-scrape.json`,
);
console.log(`Text assets copied → web/public/${staticBase}/`);
console.log(`HTML served in dev from ${sessionDir} via /scrape-assets/`);
