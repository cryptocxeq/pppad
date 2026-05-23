import { describe, expect, it } from "vitest";
import { pageHtmlBasename, urlCaptureSlug } from "./htmlCapturePaths.js";

describe("urlCaptureSlug", () => {
  it("uses pageId from hash when preserveHash is true", () => {
    const url =
      "https://v3.pebblepad.co.uk/spa/#/workbook/abc?pageId=fa865ebd-5951-4e34-ab14-d2eedade78e2";
    expect(urlCaptureSlug(url, true)).toBe("fa865ebd-5951-4e34-ab14-d2eedade78e2");
  });

  it("uses pathname when preserveHash is false", () => {
    expect(urlCaptureSlug("https://example.com/foo/bar", false)).toBe("foo-bar");
  });
});

describe("pageHtmlBasename", () => {
  it("pads index and includes slug", () => {
    expect(pageHtmlBasename(3, "abc")).toBe("p003-abc");
  });
});
