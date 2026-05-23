import { describe, expect, it } from "vitest";
import { isPlaywrightTargetClosedError } from "./playwrightClosed.js";

describe("isPlaywrightTargetClosedError", () => {
  it("detects Playwright-style target closed errors", () => {
    const e = new Error("Target page, context or browser has been closed");
    e.name = "TargetClosedError";
    expect(isPlaywrightTargetClosedError(e)).toBe(true);
  });

  it("detects message-only variants", () => {
    expect(isPlaywrightTargetClosedError(new Error("Target page, context or browser has been closed"))).toBe(true);
    expect(isPlaywrightTargetClosedError(new Error("something else closed"))).toBe(false);
    expect(isPlaywrightTargetClosedError(null)).toBe(false);
  });

  it("follows error.cause", () => {
    const inner = new Error("Target page, context or browser has been closed");
    inner.name = "TargetClosedError";
    const outer = new Error("wrapper");
    (outer as { cause: Error }).cause = inner;
    expect(isPlaywrightTargetClosedError(outer)).toBe(true);
  });
});
