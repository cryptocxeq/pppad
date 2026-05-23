import { describe, expect, it } from "vitest";
import type { PageSnapshot } from "./pageSnapshotTypes.js";
import { mergeTextForAnalysis } from "./mergeText.js";

describe("mergeTextForAnalysis", () => {
  it("includes subtitles and PDF excerpts in the merged corpus", () => {
    const snapshot: PageSnapshot = {
      title: "t",
      url: "https://example.test/p",
      capturedAtIso: "2026-05-06T00:00:00.000Z",
      visibleText: "Main body text.",
      links: [],
      domHints: {
        emptyRequiredTextFields: 0,
        emptyTextAreas: 0,
        uncheckedRequiredCheckboxes: 0,
        ariaInvalidCount: 0,
        details: [],
      },
      imageHints: [{ alt: "Rubric overview", src: "https://example.test/i.png", ariaLabel: "", title: "" }],
      subtitles: [{ label: "en", url: "https://example.test/c.vtt", format: "vtt", text: "Say hello." }],
      linkedPdfs: [
        { url: "https://example.test/a.pdf", extractedTextPreview: "PDF says: submit weekly." },
      ],
      panoptoCaptions: [],
    };

    expect(mergeTextForAnalysis(snapshot)).toContain("Main body text.");
    expect(mergeTextForAnalysis(snapshot)).toContain("Subtitles (en): Say hello.");
    expect(mergeTextForAnalysis(snapshot)).toContain("Linked PDF text excerpt");
    expect(mergeTextForAnalysis(snapshot)).toContain("Image text: Rubric overview");
  });
});
