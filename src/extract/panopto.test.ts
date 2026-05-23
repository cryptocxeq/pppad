import { describe, expect, it } from "vitest";
import { detectPanoptoLinks } from "./panopto.js";

describe("detectPanoptoLinks", () => {
  it("detects Panopto Viewer URLs and extracts session IDs", () => {
    const links = [
      { href: "https://uwe.cloud.panopto.eu/Panopto/Pages/Viewer.aspx?id=aaab649c-c09b-4027-a36e-aedd00b7b7ad&start=23" },
      { href: "https://example.com/unrelated" },
      { href: "https://uwe.cloud.panopto.eu/Panopto/Pages/Embed.aspx?id=bbbb1234-abcd-5678-efab-000000000001" },
      // duplicate of first
      { href: "https://uwe.cloud.panopto.eu/Panopto/Pages/Viewer.aspx?id=aaab649c-c09b-4027-a36e-aedd00b7b7ad" },
    ];

    const result = detectPanoptoLinks(links);
    expect(result).toHaveLength(2);
    expect(result[0].sessionId).toBe("aaab649c-c09b-4027-a36e-aedd00b7b7ad");
    expect(result[0].origin).toBe("https://uwe.cloud.panopto.eu");
    expect(result[1].sessionId).toBe("bbbb1234-abcd-5678-efab-000000000001");
  });

  it("returns empty for non-Panopto links", () => {
    const links = [
      { href: "https://example.com/page" },
      { href: "https://youtube.com/watch?v=abc" },
    ];
    expect(detectPanoptoLinks(links)).toHaveLength(0);
  });
});
