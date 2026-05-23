export type PageStatus = "unknown" | "complete" | "incomplete";

export type PageFinding = {
  title: string;
  url: string;
  status: PageStatus;
  requiredWork: string[];
  detectedRequirements: string[];
  unclear: string[];
};

export type WorkbookFinding = {
  title: string;
  pages: PageFinding[];
};

export type RequirementReport = {
  generatedAtIso: string;
  workbooks: WorkbookFinding[];
  notes?: string[];
};
