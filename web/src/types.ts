export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type RequirementCategory =
  | "compliance"
  | "assessment-a"
  | "assessment-b"
  | "teaching-log"
  | "panopto"
  | "ai-policy"
  | "formative"
  | "reference";

export type ChecklistItem = {
  id: string;
  label: string;
  detail?: string;
};

export type RequirementTask = {
  id: string;
  category: RequirementCategory;
  title: string;
  summary: string;
  weight?: string;
  deadline?: string;
  deadlineNote?: string;
  priority: TaskPriority;
  pebblePage?: string;
  pebbleUrl?: string;
  contacts?: { label: string; value: string }[];
  checklist: ChecklistItem[];
  steps?: string[];
  warnings?: string[];
  scrapeHints?: string[];
};

export type CategoryMeta = {
  id: RequirementCategory;
  label: string;
  description: string;
  icon: string;
};

export type ScrapePageIndex = {
  name: string;
  url: string;
  excerpt: string;
  detectedRequirements: string[];
  requiredWork: string[];
  unclear: string[];
};

export type CaptureQuality = "rich" | "placeholder-only" | "viewer-shell" | "minimal";

export type DomScrapeCapture = {
  index: number;
  title: string;
  url: string;
  pageId: string | null;
  captureQuality: CaptureQuality;
  assetDir: string;
  contentLength: number;
  contentPreview: string;
  linkedDocuments: Array<{ relPath: string; url: string; format?: string }>;
};

export type WalkScrapeSlice = {
  name: string;
  url: string;
  excerpt: string;
  detectedRequirements: string[];
  requiredWork: string[];
  unclear: string[];
};

export type UnifiedScrapePage = {
  pebblePage: string;
  pageNameNorm: string;
  dom: DomScrapeCapture | null;
  walk: WalkScrapeSlice | null;
};

export type UnifiedScrapeIndex = {
  builtAt: string;
  dom: {
    sessionStamp: string;
    sessionFolderName: string;
    captureCount: number;
    uniquePageCount: number;
    staticAssetsBase: string;
  } | null;
  walk: {
    generatedAt?: string;
    sourceFile: string;
    pageCount: number;
  } | null;
  pagesByName: Record<string, UnifiedScrapePage>;
  captures: Array<{
    index: number;
    pageName: string;
    title: string;
    url: string;
    captureQuality: CaptureQuality;
    assetDir: string;
    linkedDocumentCount: number;
  }>;
};

export type ProgressState = {
  tasks: Record<string, TaskStatus>;
  checklist: Record<string, boolean>;
  notes: Record<string, string>;
};
