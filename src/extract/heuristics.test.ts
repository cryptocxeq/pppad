import { describe, expect, it } from "vitest";
import { analyzeVisibleText } from "./heuristics.js";

describe("analyzeVisibleText", () => {
  it("detects word-count guidance", () => {
    const text = "Please write 300-500 words reflecting on your practice.";
    const result = analyzeVisibleText(text);
    expect(result.wordCountHints).toContain("Word count guidance: 300-500 words");
  });

  it("detects upload / evidence language", () => {
    const text = "You must upload one file as evidence of attendance.";
    const result = analyzeVisibleText(text);
    expect(result.uploadHints.length).toBeGreaterThan(0);
    expect(result.uploadHints.some((h) => h.toLowerCase().includes("upload"))).toBe(true);
  });

  it("detects deadline language with a calendar date", () => {
    const text = "Submission deadline: 12 May 2026 before 5pm.";
    const result = analyzeVisibleText(text);
    expect(result.deadlineHints.some((h) => h.includes("12 May 2026"))).toBe(true);
  });

  it("flags missing explicit deadline when instructions look assessable", () => {
    const text =
      "Assessment: Write a reflection and upload evidence. Rubric: critical thinking.";
    const result = analyzeVisibleText(text);
    expect(result.unclear.some((u) => u.toLowerCase().includes("deadline"))).toBe(true);
  });
});
