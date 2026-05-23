import { describe, expect, it } from "vitest";
import { cappedPositiveInt, intInRange } from "./cliNumbers.js";

describe("intInRange", () => {
  it("clamps and truncates", () => {
    expect(intInRange("12.9", 99, 1, 100)).toBe(12);
    expect(intInRange("0", 5, 1, 10)).toBe(1);
    expect(intInRange("999", 5, 1, 10)).toBe(10);
    expect(intInRange("nope", 7, 1, 10)).toBe(7);
  });
});

describe("cappedPositiveInt", () => {
  it("truncates and caps", () => {
    expect(cappedPositiveInt("30", 100)).toBe(30);
    expect(cappedPositiveInt("12.9", 100)).toBe(12);
    expect(cappedPositiveInt("999", 100)).toBe(100);
  });

  it("rejects non-positive", () => {
    expect(() => cappedPositiveInt("0", 10)).toThrow(/positive integer/i);
    expect(() => cappedPositiveInt("nope", 10)).toThrow(/positive integer/i);
  });
});
