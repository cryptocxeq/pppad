import { describe, expect, it } from "vitest";
import { renderRequirementReportMarkdown } from "./markdown.js";
import type { RequirementReport } from "./types.js";

describe("renderRequirementReportMarkdown", () => {
  it("renders workbook sections, pages, and lists", () => {
    const report: RequirementReport = {
      generatedAtIso: "2026-05-06T03:30:00.000Z",
      workbooks: [
        {
          title: "Professional Development Portfolio",
          pages: [
            {
              title: "Week 1 Reflection",
              url: "https://example.pebblepad.net/page-1",
              status: "incomplete",
              requiredWork: [
                "Write a short reflection",
                "Upload one piece of evidence",
                "Connect reflection to learning outcome 1",
              ],
              detectedRequirements: [
                "Approx. 300–500 words",
                "Must include personal experience",
                "Must mention what was learned",
                "Evidence upload required",
              ],
              unclear: [
                "Deadline not visible on page",
                "Unsure whether supervisor feedback is required",
              ],
            },
          ],
        },
      ],
      notes: ["Supervised scan; only visible content was captured."],
    };

    expect(renderRequirementReportMarkdown(report)).toBe(
      [
        "# PebblePad Requirement Summary",
        "",
        "_Generated: 2026-05-06T03:30:00.000Z_",
        "",
        "## Workbook: Professional Development Portfolio",
        "",
        "### Page: Week 1 Reflection",
        "",
        "**URL:** https://example.pebblepad.net/page-1",
        "",
        "**Status:** Incomplete",
        "",
        "#### Required Work",
        "",
        "- Write a short reflection",
        "- Upload one piece of evidence",
        "- Connect reflection to learning outcome 1",
        "",
        "#### Detected Requirements",
        "",
        "- Approx. 300–500 words",
        "- Must include personal experience",
        "- Must mention what was learned",
        "- Evidence upload required",
        "",
        "#### Unclear / Needs Manual Review",
        "",
        "- Deadline not visible on page",
        "- Unsure whether supervisor feedback is required",
        "",
        "## Notes",
        "",
        "- Supervised scan; only visible content was captured.",
        "",
      ].join("\n"),
    );
  });

  it("omits optional sections when empty", () => {
    const report: RequirementReport = {
      generatedAtIso: "2026-05-06T03:30:00.000Z",
      workbooks: [
        {
          title: "Solo Workbook",
          pages: [
            {
              title: "Only Page",
              url: "https://example.pebblepad.net/p",
              status: "unknown",
              requiredWork: [],
              detectedRequirements: [],
              unclear: [],
            },
          ],
        },
      ],
    };

    const md = renderRequirementReportMarkdown(report);
    expect(md).toContain("### Page: Only Page");
    expect(md).not.toContain("#### Required Work");
    expect(md).not.toContain("## Notes");
  });
});
