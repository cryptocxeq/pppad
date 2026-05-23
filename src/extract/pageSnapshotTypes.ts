import type { DomCompletionHints } from "./domHints.js";
import type { PanoptoCaptionCapture } from "./panopto.js";
import type { SubtitleCapture } from "./subtitles.js";

export type ImageHint = {
  alt: string;
  src: string;
  ariaLabel?: string;
  title?: string;
};

export type LinkedDocumentFormat = "pdf" | "pptx" | "ppt" | "docx" | "doc";

export type LinkedPdfCapture = {
  url: string;
  extractedTextPreview: string;
  error?: string;
  bytesRead?: number;
  /** When omitted, treated as PDF (backwards compatible). */
  format?: LinkedDocumentFormat;
};

export type PageSnapshot = {
  title: string;
  url: string;
  capturedAtIso: string;
  visibleText: string;
  links: { text: string; href: string; download?: string }[];
  domHints: DomCompletionHints;
  imageHints: ImageHint[];
  subtitles: SubtitleCapture[];
  linkedPdfs: LinkedPdfCapture[];
  panoptoCaptions: PanoptoCaptionCapture[];
};

export type CapturePageOptions = {
  fetchSubtitles: boolean;
  fetchPdfs: boolean;
  fetchPanopto: boolean;
  maxPdfBytes: number;
  maxPdfsPerPage: number;
  pdfPreviewChars: number;
  subtitleMaxBytesPerFile: number;
  subtitleMaxFiles: number;
  panoptoMaxSessions: number;
  panoptoMaxBytesPerFile: number;
  panoptoTimeout: number;
  /** CSS selector to restrict content extraction (text, links, images, form hints). */
  contentScope: string | null;
  /**
   * Open same-origin PebblePad `#/viewer/...` routes in a helper tab to harvest embedded or
   * late-mounted PDF/PPTX/DOCX URLs (counts toward maxPdfsPerPage).
   */
  digPebblePadViewerDocuments: boolean;
  maxViewerDigestsPerSnapshot: number;
  viewerSpinnerWaitMs: number;
  viewerSettleMs: number;
  viewerGotoTimeoutMs: number;
};

export const defaultCapturePageOptions: CapturePageOptions = {
  fetchSubtitles: true,
  fetchPdfs: true,
  fetchPanopto: true,
  maxPdfBytes: 15 * 1024 * 1024,
  maxPdfsPerPage: 25,
  pdfPreviewChars: 8000,
  subtitleMaxBytesPerFile: 2 * 1024 * 1024,
  subtitleMaxFiles: 6,
  panoptoMaxSessions: 10,
  panoptoMaxBytesPerFile: 4 * 1024 * 1024,
  panoptoTimeout: 30_000,
  contentScope: null,
  digPebblePadViewerDocuments: true,
  maxViewerDigestsPerSnapshot: 5,
  viewerSpinnerWaitMs: 120_000,
  viewerSettleMs: 5000,
  viewerGotoTimeoutMs: 90_000,
};
