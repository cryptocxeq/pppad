import type { Page } from "playwright";

import { readWorkbookVisibleText, waitForPebblePadWorkbookContent } from "../browser/pebblepadContentReady.js";
import { pauseForCrawlCapture, type AfterNavigationPauseResult } from "../browser/crawlDiscovery.js";
import {
  evaluateDomStructuralSummary,
  type CaptureQuality,
  type DomSummary,
} from "./domSummary.js";
import { isPebblePadViewerHref } from "./pdf.js";
import { mergeTextForAnalysis } from "./mergeText.js";
import {
  capturePageSnapshot,
  type CapturePageOptions,
  defaultCapturePageOptions,
} from "./snapshot.js";
import { PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE } from "../lib/url.js";
import {
  isPlaceholderOnlyVisibleText,
  isViewerLoadingShell,
} from "../lib/placeholderText.js";

export type { CaptureQuality } from "./domSummary.js";

export type RichPageCapture = {
  html: string;
  domSummary: DomSummary;
  mergedText: string;
  workbookVisibleText: string;
  quality: CaptureQuality;
  contentWait: "ready" | "timeout" | "skipped";
  pause: AfterNavigationPauseResult;
  snapshot: Awaited<ReturnType<typeof capturePageSnapshot>>;
};

export type RichCapturePassOptions = {
  spinnerWaitMs: number;
  autoScroll: boolean;
  scrollPauseMs: number;
  settleMs: number;
  contentWaitMs: number;
  capture: Partial<CapturePageOptions>;
  workbookContentScope?: string | null;
};

export function defaultRichCaptureForUrl(pageUrl: string): Partial<CapturePageOptions> {
  const base: Partial<CapturePageOptions> = {
    fetchSubtitles: true,
    fetchPdfs: true,
    fetchPanopto: true,
    digPebblePadViewerDocuments: true,
    maxPdfsPerPage: 25,
    pdfPreviewChars: 50_000,
    maxViewerDigestsPerSnapshot: 8,
    viewerSpinnerWaitMs: 120_000,
    viewerSettleMs: 8000,
  };

  try {
    const u = new URL(pageUrl);
    if (/pebblepad\.co\.uk$/i.test(u.hostname) && u.hash.toLowerCase().includes("#/workbook/")) {
      base.contentScope = PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE.split(",")[1]!.trim();
    }
  } catch {
    /* ignore */
  }

  return base;
}

function classifyQuality(
  url: string,
  workbookText: string,
  mergedText: string,
  snapshot: RichPageCapture["snapshot"],
): CaptureQuality {
  if (isPebblePadViewerHref(url)) {
    if (isViewerLoadingShell(mergedText) || isViewerLoadingShell(workbookText)) {
      return "viewer-shell";
    }
  }

  const hasLinkedDocs = snapshot.linkedPdfs.some(
    (d) => (d.extractedTextPreview?.trim().length ?? 0) > 80,
  );
  const hasSubstantialMerged = mergedText.trim().length > 600;

  if (isPlaceholderOnlyVisibleText(workbookText) && !hasLinkedDocs && !hasSubstantialMerged) {
    return "placeholder-only";
  }

  if (mergedText.trim().length < 80 && !hasLinkedDocs) return "minimal";
  return "rich";
}

export async function captureRichPage(
  page: Page,
  opts: RichCapturePassOptions,
): Promise<RichPageCapture> {
  const captureOpts: CapturePageOptions = {
    ...defaultCapturePageOptions,
    ...defaultRichCaptureForUrl(page.url()),
    ...opts.capture,
  };

  const pause = await pauseForCrawlCapture(page, {
    spinnerWaitMs: opts.spinnerWaitMs,
    autoScroll: opts.autoScroll,
    scrollPauseMs: opts.scrollPauseMs,
    settleMs: opts.settleMs,
  });

  const scope =
    opts.workbookContentScope ??
    captureOpts.contentScope ??
    PEBBLEPAD_WORKBOOK_DEFAULT_LINK_SCOPE.split(",")[1]!.trim();

  const contentWait = await waitForPebblePadWorkbookContent(page, {
    contentWaitMs: opts.contentWaitMs,
    scopeSelector: scope,
  });

  if (contentWait === "timeout") {
    console.warn(
      `[capture-dom] Workbook content still looks like a placeholder after ${opts.contentWaitMs}ms — capturing anyway (linked documents will still be fetched).`,
    );
  }

  const snapshot = await capturePageSnapshot(page, captureOpts);
  const mergedText = mergeTextForAnalysis(snapshot);
  const workbookVisibleText = await readWorkbookVisibleText(page, scope);
  const quality = classifyQuality(page.url(), workbookVisibleText, mergedText, snapshot);

  const title = await page.title();
  const url = page.url();
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  const structural = await evaluateDomStructuralSummary(page);
  const html = await page.content();

  const domSummary: DomSummary = {
    capturedAtIso: new Date().toISOString(),
    title,
    url,
    viewport,
    ...structural,
    captureQuality: quality,
    contentWait,
    workbookVisibleCharCount: workbookVisibleText.length,
    linkedDocumentCount: snapshot.linkedPdfs.length,
    linkedDocumentsWithText: snapshot.linkedPdfs.filter(
      (d) => d.extractedTextPreview.trim().length > 0,
    ).length,
  };

  return {
    html,
    domSummary,
    mergedText,
    workbookVisibleText,
    quality,
    contentWait,
    pause,
    snapshot,
  };
}
