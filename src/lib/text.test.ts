import { describe, expect, it } from "vitest";
import { truncateUtf16Chars } from "./text.js";

describe("truncateUtf16Chars", () => {
  it("truncates to a max total length (including ellipsis) measured in UTF-16 code units", () => {
    expect(truncateUtf16Chars("abcdef", 4)).toBe("abc…");
    expect(truncateUtf16Chars("abcdef", 3)).toBe("ab…");
    expect(truncateUtf16Chars("hi", 10)).toBe("hi");
  });
});
