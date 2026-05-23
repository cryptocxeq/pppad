import { describe, expect, it } from "vitest";
import { parseSrtToPlainText, parseVttToPlainText } from "./vtt.js";

describe("parseVttToPlainText", () => {
  it("strips timing/metadata and keeps cue text", () => {
    const vtt = [
      "WEBVTT",
      "",
      "00:00:01.000 --> 00:00:04.000 line:90%",
      "Hello from the instructions.",
      "",
      "00:00:05.000 --> 00:00:07.000",
      "Upload your evidence file.",
      "",
    ].join("\n");

    expect(parseVttToPlainText(vtt)).toBe("Hello from the instructions. Upload your evidence file.");
  });
});

describe("parseSrtToPlainText", () => {
  it("strips indexes and timecodes", () => {
    const srt = [
      "1",
      "00:00:01,000 --> 00:00:04,000",
      "Rubric: critical thinking.",
      "",
      "2",
      "00:00:05,000 --> 00:00:07,000",
      "Deadline is on the assessment page.",
      "",
    ].join("\n");

    expect(parseSrtToPlainText(srt)).toBe("Rubric: critical thinking. Deadline is on the assessment page.");
  });
});
