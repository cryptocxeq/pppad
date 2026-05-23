import JSZip from "jszip";

import { truncateUtf16Chars } from "../lib/text.js";

const XML_TAG_RE = /<[^>]+>/g;

function xmlToPlain(xml: string): string {
  return xml.replace(XML_TAG_RE, " ").replace(/\s+/g, " ").trim();
}

/**
 * Pull visible-ish text from OOXML slide XML (no layout intelligence).
 */
export async function extractPptxPlainText(buffer: Buffer, maxChars: number): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n));
  names.sort((a, b) => {
    const na = Number(/slide(\d+)/i.exec(a)?.[1] ?? 0);
    const nb = Number(/slide(\d+)/i.exec(b)?.[1] ?? 0);
    return na - nb;
  });
  const chunks: string[] = [];
  for (const name of names) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async("string");
    const t = xmlToPlain(xml);
    if (t) chunks.push(t);
    if (chunks.join("\n\n").length >= maxChars) break;
  }
  return truncateUtf16Chars(chunks.join("\n\n"), maxChars);
}

/**
 * Pull visible-ish text from OOXML Word main document.
 */
export async function extractDocxPlainText(buffer: Buffer, maxChars: number): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const doc = zip.file("word/document.xml");
  if (!doc) return "";
  const xml = await doc.async("string");
  return truncateUtf16Chars(xmlToPlain(xml), maxChars);
}

/** Distinguish PPTX vs DOCX for bare ZIP / octet-stream bodies (e.g. PebblePad `File/Original?id=`). */
export async function sniffOpenXmlKindFromBuffer(buffer: Buffer): Promise<"pptx" | "docx" | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files).map((n) => n.replace(/\\/g, "/"));
    if (names.some((n) => /^ppt\//i.test(n))) return "pptx";
    if (names.some((n) => n.toLowerCase() === "word/document.xml")) return "docx";
    return null;
  } catch {
    return null;
  }
}
