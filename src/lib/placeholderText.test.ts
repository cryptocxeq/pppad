import { describe, expect, it } from "vitest";
import { isPlaceholderOnlyVisibleText, isViewerLoadingShell } from "./placeholderText.js";

describe("isPlaceholderOnlyVisibleText", () => {
  it("flags empty-form placeholder pages", () => {
    expect(
      isPlaceholderOnlyVisibleText(
        "Assessment A\n\nThis form is yet to be completed\n\nEnter a title for this page",
      ),
    ).toBe(true);
  });

  it("accepts pages with real brief text", () => {
    expect(
      isPlaceholderOnlyVisibleText(
        "Assessment B\n\nWhat is your philosophy on education? Discuss your philosophy with reference to literature.",
      ),
    ).toBe(false);
  });
});

describe("isViewerLoadingShell", () => {
  it("detects asset preview loading UI", () => {
    expect(isViewerLoadingShell("Preview asset\n\nLoading")).toBe(true);
  });
});
