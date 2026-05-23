#!/usr/bin/env node
/**
 * Builds web/public/scrape-index.json from the latest PebblePad walk output.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out");

function latestWalkJson() {
  const files = readdirSync(outDir)
    .filter((f) => f.startsWith("pebblepad-walk-") && f.endsWith(".json"))
    .map((f) => ({ f, m: statSync(join(outDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!files.length) return null;
  return join(outDir, files[0].f);
}

function extractPageName(visibleText) {
  const re = /i\n(.+?) from .+ has loaded/g;
  const names = [];
  let m;
  while ((m = re.exec(visibleText))) names.push(m[1].trim());
  return names.at(-1) ?? null;
}

function excerpt(text, max = 480) {
  const cleaned = text
    .replace(/Skip to main content/g, "")
    .replace(/Enter a title for this page/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}

const dest = join(root, "web", "public", "scrape-index.json");
const walkPath = latestWalkJson();

if (!walkPath) {
  if (statSync(dest, { throwIfNoEntry: false })) {
    console.log(`No walk JSON in out/ — keeping existing ${dest}`);
    process.exit(0);
  }
  throw new Error("No pebblepad-walk-*.json in out/ and no existing scrape-index.json");
}

const data = JSON.parse(readFileSync(walkPath, "utf8"));
const byName = new Map();

for (const { snapshot, analysis } of data.pages ?? []) {
  const name = extractPageName(snapshot.visibleText);
  if (!name) continue;

  const existing = byName.get(name);
  const entry = {
    name,
    url: snapshot.url,
    excerpt: excerpt(snapshot.visibleText),
    detectedRequirements: analysis?.detectedRequirements ?? [],
    requiredWork: analysis?.requiredWork ?? [],
    unclear: analysis?.unclear ?? [],
  };

  if (!existing || snapshot.visibleText.length > (existing._len ?? 0)) {
    byName.set(name, { ...entry, _len: snapshot.visibleText.length });
  }
}

const index = [...byName.values()]
  .map(({ _len: _, ...rest }) => rest)
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  dest,
  JSON.stringify(
    {
      generatedAt: data.report?.generatedAtIso ?? new Date().toISOString(),
      sourceFile: walkPath.replace(root + "/", ""),
      pageCount: index.length,
      pages: index,
    },
    null,
    2,
  ),
);
console.log(`Wrote ${index.length} pages → ${dest}`);
