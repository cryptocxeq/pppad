import type { HeuristicAnalysis } from "../extract/heuristics.js";
import type { PageSnapshot } from "../extract/pageSnapshotTypes.js";
import type { PageStatus, RequirementReport } from "./types.js";

function derivePageStatus(dom: PageSnapshot["domHints"]): PageStatus {
  if (dom.emptyRequiredTextFields + dom.emptyTextAreas + dom.uncheckedRequiredCheckboxes > 0) {
    return "incomplete";
  }
  if (dom.ariaInvalidCount > 0) {
    return "incomplete";
  }
  return "unknown";
}

export function buildWorkbookReport(args: {
  workbookTitle: string;
  pages: Array<{ snapshot: PageSnapshot; analysis: HeuristicAnalysis }>;
}): RequirementReport {
  const pages = args.pages.map(({ snapshot, analysis }) => {
    const detectedRequirements = [
      ...analysis.wordCountHints,
      ...analysis.deadlineHints,
      ...analysis.uploadHints,
      ...analysis.reflectionHints,
      ...analysis.checklistHints,
    ];

    const requiredWork: string[] = [];
    if (analysis.uploadHints.length > 0) {
      requiredWork.push("Upload/attach evidence or files (confirm exact requirements on the page).");
    }
    if (analysis.reflectionHints.length > 0) {
      requiredWork.push("Complete reflection-related tasks described on the page.");
    }
    if (analysis.checklistHints.length > 0) {
      requiredWork.push("Review checklist/tick-box completion items on the page.");
    }

    if (snapshot.domHints.emptyRequiredTextFields + snapshot.domHints.emptyTextAreas > 0) {
      requiredWork.push("Fill required fields/text areas flagged as empty (verify in PebblePad).");
    }
    if (snapshot.domHints.uncheckedRequiredCheckboxes > 0) {
      requiredWork.push("Complete required checkboxes flagged as unchecked (verify in PebblePad).");
    }

    const unclear = [...analysis.unclear];

    for (const s of snapshot.subtitles) {
      if (s.error) {
        unclear.push(`Subtitle/caption track could not be fetched (${s.label}): ${s.error}`);
      }
    }

    for (const p of snapshot.linkedPdfs) {
      if (p.error) {
        const fmt = (p.format ?? "pdf").toUpperCase();
        unclear.push(`Linked document could not be processed (${fmt}, ${p.url}): ${p.error}`);
      }
    }

    return {
      title: snapshot.title.trim() || "Untitled page",
      url: snapshot.url,
      status: derivePageStatus(snapshot.domHints),
      requiredWork,
      detectedRequirements,
      unclear,
    };
  });

  return {
    generatedAtIso: new Date().toISOString(),
    workbooks: [
      {
        title: args.workbookTitle,
        pages,
      },
    ],
    notes: [
      "Supervised scan: captures visible page text, image alt/labels, optional caption files (WebVTT/SRT), and optional linked PDF / PPTX / DOCX text excerpts (legacy PPT/DOC are flagged only).",
      "Videos are not downloaded; only subtitle/caption sidecar files are fetched when present.",
      `This workbook summary contains ${pages.length} captured page(s).`,
    ],
  };
}

/** @deprecated Prefer `buildWorkbookReport` (kept for older call sites/tests). */
export function buildReportFromSnapshot(args: {
  workbookTitle: string;
  snapshot: PageSnapshot;
  analysis: HeuristicAnalysis;
}): RequirementReport {
  return buildWorkbookReport({
    workbookTitle: args.workbookTitle,
    pages: [{ snapshot: args.snapshot, analysis: args.analysis }],
  });
}
