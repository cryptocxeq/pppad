import { describe, expect, it } from "vitest";
import {
  defaultPebblePadWorkbookLinkScope,
  defaultWalkPrefixForUrl,
  isAllowedWalkTarget,
  normalizeCrawlUrlKey,
  normalizeUrlKey,
  PEBBLEPAD_QUICK_NAV_LINK_SCOPE,
  PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE,
  resolveCrawlLinkScope,
  shouldSkipLinkForCrawl,
} from "./url.js";

describe("normalizeUrlKey", () => {
  it("removes hashes and normalizes query parameter ordering", () => {
    expect(normalizeUrlKey("https://example.test/a?b=2&a=1#frag")).toBe("https://example.test/a?a=1&b=2");
  });
});

describe("normalizeCrawlUrlKey", () => {
  it("can preserve hashes for hash-router SPAs", () => {
    expect(normalizeCrawlUrlKey("https://example.test/app?b=2&a=1#/route", true)).toBe(
      "https://example.test/app?a=1&b=2#/route",
    );
  });

  it("preserves PebblePad-style hash routes with query inside the fragment", () => {
    const raw =
      "https://v3.pebblepad.co.uk/spa/#/workbook/gw56f9Zxhkttthh7x8rW7fn8fy?historyId=n63dmPaFTO&pageId=fa865ebd-5951-4e34-ab14-d2eedade78e2";
    expect(normalizeCrawlUrlKey(raw, true)).toBe(raw);
  });
});

describe("defaultPebblePadWorkbookLinkScope / resolveCrawlLinkScope", () => {
  it("defaults PebblePad workbook hash URLs to quick navigation plus workbook builder", () => {
    const u =
      "https://v3.pebblepad.co.uk/spa/#/workbook/gw56f9Zxhkttthh7x8rW7fn8fy?historyId=n63dmPaFTO&pageId=fa865ebd-5951-4e34-ab14-d2eedade78e2";
    expect(defaultPebblePadWorkbookLinkScope(u)).toBe(PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE);
    expect(resolveCrawlLinkScope(u, null)).toEqual({
      selector: PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE,
      strict: true,
    });
  });

  it("does not default non-workbook PebblePad URLs", () => {
    const u = "https://v3.pebblepad.co.uk/spa/#/viewer/abc";
    expect(defaultPebblePadWorkbookLinkScope(u)).toBeNull();
    expect(resolveCrawlLinkScope(u, null)).toEqual({ selector: null, strict: false });
  });

  it("honours explicit --link-scope and marks PebblePad workbook default selectors as strict", () => {
    const u = "https://example.test/";
    expect(resolveCrawlLinkScope(u, PEBBLEPAD_QUICK_NAV_LINK_SCOPE)).toEqual({
      selector: PEBBLEPAD_QUICK_NAV_LINK_SCOPE,
      strict: true,
    });
    expect(resolveCrawlLinkScope(u, PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE)).toEqual({
      selector: PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE,
      strict: true,
    });
    expect(resolveCrawlLinkScope(u, "body")).toEqual({ selector: "body", strict: false });
  });
});

describe("defaultWalkPrefixForUrl", () => {
  it("uses the parent folder so sibling pages are crawlable", () => {
    const start = "https://example.test/workbook/123/page-a";
    expect(defaultWalkPrefixForUrl(start)).toBe("https://example.test/workbook/123/");

    const args = {
      startOrigin: "https://example.test",
      startHostname: "example.test",
      sameOriginOnly: true,
      urlPrefix: defaultWalkPrefixForUrl(start),
      sharedHostSuffix: null as string | null,
    };

    expect(isAllowedWalkTarget("https://example.test/workbook/123/page-b", args)).toBe(true);
    expect(isAllowedWalkTarget("https://example.test/workbook/999/page-a", args)).toBe(false);
  });
});

describe("shouldSkipLinkForCrawl", () => {
  it("skips PebblePad viewer routes by default", () => {
    const viewer = "https://v3.pebblepad.co.uk/spa/#/viewer/gw56f9Z4H59sf3gHctZyh6yc3w";
    expect(shouldSkipLinkForCrawl(viewer)).toBe(true);
    expect(shouldSkipLinkForCrawl(viewer, { allowViewerRoutes: true })).toBe(false);
  });
});

describe("isAllowedWalkTarget", () => {
  it("allows same-origin links under a path prefix", () => {
    const args = {
      startOrigin: "https://example.test",
      startHostname: "example.test",
      sameOriginOnly: true,
      urlPrefix: "https://example.test/workbook",
      sharedHostSuffix: null,
    };

    expect(isAllowedWalkTarget("https://example.test/workbook/page", args)).toBe(true);
    expect(isAllowedWalkTarget("https://example.test/workbook2", args)).toBe(false);
    expect(isAllowedWalkTarget("https://other.test/workbook/page", args)).toBe(false);
  });

  it("treats a '/' prefix as 'any path on the same origin'", () => {
    const args = {
      startOrigin: "https://example.test",
      startHostname: "example.test",
      sameOriginOnly: true,
      urlPrefix: "https://example.test/",
      sharedHostSuffix: null,
    };

    expect(isAllowedWalkTarget("https://example.test/anything/here", args)).toBe(true);
  });

  it("allows sibling subdomains when sharedHostSuffix matches (PebblePad v3 + atlas)", () => {
    const args = {
      startOrigin: "https://v3.pebblepad.co.uk",
      startHostname: "v3.pebblepad.co.uk",
      sameOriginOnly: true,
      urlPrefix: "https://v3.pebblepad.co.uk/spa/",
      sharedHostSuffix: "pebblepad.co.uk",
    };

    expect(isAllowedWalkTarget("https://atlas.pebblepad.co.uk/atlas/uwe", args)).toBe(true);
    expect(isAllowedWalkTarget("https://v3.pebblepad.co.uk/spa/foo", args)).toBe(true);
    expect(isAllowedWalkTarget("https://v3.pebblepad.co.uk/other", args)).toBe(false);
    expect(isAllowedWalkTarget("https://google.com/", args)).toBe(false);
  });
});
