import { describe, expect, it } from "vitest";
import {
  classifyDocumentHref,
  classifyLinkForDocumentFetch,
  isPebblePadBinaryDownloadApiHref,
  isPebblePadViewerHref,
} from "./pdf.js";

describe("classifyDocumentHref", () => {
  it("detects extensions on path and filename query", () => {
    expect(classifyDocumentHref("https://x.example/a/b/Handout.pptx")).toBe("pptx");
    expect(classifyDocumentHref("https://x.example/r?filename=Notes.PDF")).toBe("pdf");
    expect(classifyDocumentHref("https://x.example/r?file=Week1.docx")).toBe("docx");
    expect(classifyDocumentHref("https://x.example/old.ppt")).toBe("ppt");
    expect(classifyDocumentHref("https://x.example/page")).toBe(null);
  });

  it("uses HTML download attribute filename when href has no extension", () => {
    const href = "https://v3.pebblepad.co.uk/plusapi/api/File/Original?id=gw56f9Z4H59sf3gHctZyh6yc3w";
    expect(classifyDocumentHref(href)).toBe(null);
    expect(classifyDocumentHref(href, { download: "Slides.pptx" })).toBe("pptx");
    expect(classifyDocumentHref(href, { download: "Reading.pdf" })).toBe("pdf");
  });
});

describe("isPebblePadBinaryDownloadApiHref", () => {
  it("detects PebblePad File/Original API URLs", () => {
    expect(
      isPebblePadBinaryDownloadApiHref("https://v3.pebblepad.co.uk/plusapi/api/File/Original?id=gw56f9Z4H59sf3gHctZyh6yc3w"),
    ).toBe(true);
    expect(isPebblePadBinaryDownloadApiHref("https://v3.pebblepad.co.uk/plusapi/api/File/Thumbnail?id=x")).toBe(false);
  });
});

describe("classifyLinkForDocumentFetch", () => {
  it("returns probe for Original API without download hint", () => {
    const href = "https://v3.pebblepad.co.uk/plusapi/api/File/Original?id=abc";
    expect(classifyLinkForDocumentFetch({ href })).toBe("probe");
  });

  it("returns pptx from download attribute without probe", () => {
    const href = "https://v3.pebblepad.co.uk/plusapi/api/File/Original?id=abc";
    expect(classifyLinkForDocumentFetch({ href, download: "Unit 1.pptx" })).toBe("pptx");
  });
});

describe("isPebblePadViewerHref", () => {
  it("detects hash-router viewer links", () => {
    expect(
      isPebblePadViewerHref("https://v3.pebblepad.co.uk/spa/#/viewer/gw56f9Z4H59sf3gHctZyh6yc3w?historyId=Jf7FBXDQT6"),
    ).toBe(true);
    expect(isPebblePadViewerHref("https://x.example/other#nope")).toBe(false);
    expect(isPebblePadViewerHref("https://x.example/app/viewer/abc123")).toBe(true);
  });
});
