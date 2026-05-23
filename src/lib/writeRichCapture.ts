import fs from "node:fs/promises";
import path from "node:path";

import type { DomSummary } from "../extract/domSummary.js";
import type { RichPageCapture } from "../extract/richCapture.js";
import type { LinkedPdfCapture } from "../extract/pageSnapshotTypes.js";

export type WrittenRichCapturePaths = {
  htmlPath: string;
  summaryPath: string;
  contentPath: string;
  snapshotPath: string;
  htmlRel: string;
  summaryRel: string;
  contentRel: string;
  snapshotRel: string;
  linkedDocs: Array<{ relPath: string; url: string; format?: string }>;
};

function linkedDocFileName(index: number, doc: LinkedPdfCapture): string {
  let base = `document-${index}`;
  try {
    const u = new URL(doc.url);
    const fromPath = path.basename(u.pathname);
    if (fromPath && fromPath !== "/") base = fromPath;
    const fromQuery = u.searchParams.get("filename") ?? u.searchParams.get("file");
    if (fromQuery) base = decodeURIComponent(fromQuery);
  } catch {
    /* ignore */
  }
  const fmt = doc.format ?? "pdf";
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  return `${String(index).padStart(2, "0")}-${safe}.${fmt}.txt`;
}

export async function writeRichCaptureFiles(args: {
  pagesDir: string;
  baseName: string;
  rich: RichPageCapture;
  domSummary: DomSummary;
}): Promise<WrittenRichCapturePaths> {
  const pageDir = path.join(args.pagesDir, args.baseName);
  await fs.mkdir(pageDir, { recursive: true });

  const htmlName = "page.html";
  const summaryName = "summary.json";
  const contentName = "content.txt";
  const snapshotName = "snapshot.json";
  const docsDir = path.join(pageDir, "linked-docs");

  await fs.writeFile(path.join(pageDir, htmlName), args.rich.html, "utf8");
  await fs.writeFile(path.join(pageDir, summaryName), `${JSON.stringify(args.domSummary, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(pageDir, contentName), `${args.rich.mergedText}\n`, "utf8");
  await fs.writeFile(
    path.join(pageDir, snapshotName),
    `${JSON.stringify(args.rich.snapshot, null, 2)}\n`,
    "utf8",
  );

  const linkedDocs: WrittenRichCapturePaths["linkedDocs"] = [];
  const withText = args.rich.snapshot.linkedPdfs.filter(
    (d) => d.extractedTextPreview.trim().length > 0,
  );

  if (withText.length > 0) {
    await fs.mkdir(docsDir, { recursive: true });
    let i = 0;
    for (const doc of withText) {
      i += 1;
      const fileName = linkedDocFileName(i, doc);
      const abs = path.join(docsDir, fileName);
      const header = `# ${doc.url}\n\n`;
      await fs.writeFile(abs, header + doc.extractedTextPreview.trim() + "\n", "utf8");
      linkedDocs.push({
        relPath: path.join("pages", args.baseName, "linked-docs", fileName),
        url: doc.url,
        format: doc.format,
      });
    }
  }

  const rel = (name: string) => path.join("pages", args.baseName, name);

  return {
    htmlPath: path.join(pageDir, htmlName),
    summaryPath: path.join(pageDir, summaryName),
    contentPath: path.join(pageDir, contentName),
    snapshotPath: path.join(pageDir, snapshotName),
    htmlRel: rel(htmlName),
    summaryRel: rel(summaryName),
    contentRel: rel(contentName),
    snapshotRel: rel(snapshotName),
    linkedDocs,
  };
}
