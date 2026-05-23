import type { PageFinding, RequirementReport } from "./types.js";

function formatStatus(status: PageFinding["status"]): string {
  if (status === "incomplete") return "Incomplete";
  if (status === "complete") return "Complete";
  return "Unknown";
}

function renderBullets(items: string[]): string[] {
  if (items.length === 0) return [];
  return items.map((item) => `- ${item}`);
}

export function renderRequirementReportMarkdown(report: RequirementReport): string {
  const lines: string[] = [];

  lines.push("# PebblePad Requirement Summary", "");
  lines.push(`_Generated: ${report.generatedAtIso}_`, "");

  for (const workbook of report.workbooks) {
    lines.push(`## Workbook: ${workbook.title}`, "");

    for (const page of workbook.pages) {
      lines.push(`### Page: ${page.title}`);
      lines.push("");
      lines.push(`**URL:** ${page.url}`);
      lines.push("");
      lines.push(`**Status:** ${formatStatus(page.status)}`);
      lines.push("");

      if (page.requiredWork.length > 0) {
        lines.push("#### Required Work", "", ...renderBullets(page.requiredWork), "");
      }

      if (page.detectedRequirements.length > 0) {
        lines.push("#### Detected Requirements", "", ...renderBullets(page.detectedRequirements), "");
      }

      if (page.unclear.length > 0) {
        lines.push("#### Unclear / Needs Manual Review", "", ...renderBullets(page.unclear), "");
      }
    }
  }

  if (report.notes && report.notes.length > 0) {
    lines.push("## Notes", "", ...renderBullets(report.notes), "");
  }

  return lines.join("\n");
}
