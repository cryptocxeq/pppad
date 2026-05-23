import type { Page } from "playwright";

import type { DomCompletionHints } from "./domHints.js";
import { extractLinkedDocumentSnippets, extractLinkedDocumentsFromPebblePadViewerPages } from "./pdf.js";
import {
  type CapturePageOptions,
  defaultCapturePageOptions,
  type ImageHint,
  type PageSnapshot,
} from "./pageSnapshotTypes.js";
import { extractPanoptoCaptions } from "./panopto.js";
import { collectSubtitleTrackRefs, fetchSubtitleCaptions } from "./subtitles.js";

export type { CapturePageOptions, ImageHint, PageSnapshot } from "./pageSnapshotTypes.js";
export { defaultCapturePageOptions } from "./pageSnapshotTypes.js";

/** Cap for link harvesting during crawls (workbook nav can be very link-dense). */
export const MAX_SNAPSHOT_LINKS = 500;

export async function capturePageSnapshot(
  page: Page,
  opts: Partial<CapturePageOptions> = {},
): Promise<PageSnapshot> {
  const o: CapturePageOptions = { ...defaultCapturePageOptions, ...opts };

  const capturedAtIso = new Date().toISOString();
  const title = await page.title();
  const url = page.url();

  // Expression-only: tsx/esbuild injects `__name` into serialized function bodies, which
  // breaks inside Playwright's browser VM (see crawlDiscovery.ts).
  const captureExpression = `(() => {
    const contentScope = ${JSON.stringify(o.contentScope)};
    function isVisible(el) {
      if (!(el instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    let roots;
    if (contentScope) {
      const scoped = document.querySelectorAll(contentScope);
      roots = scoped.length > 0 ? Array.from(scoped) : [document.querySelector("main") || document.body];
    } else {
      roots = [document.querySelector("main") || document.body];
    }
    const textParts = [];
    for (const root of roots) {
      const text = (root.innerText || "").replace(/\\s+\\n/g, "\\n").trim();
      if (text) textParts.push(text);
    }
    const visibleText = textParts.join("\\n\\n");
    const details = [];
    let emptyRequiredTextFields = 0;
    const textInputSel =
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"])';
    for (const root of roots) {
      for (const el of root.querySelectorAll(textInputSel)) {
        if (!isVisible(el)) continue;
        const required = el.hasAttribute("required") || el.getAttribute("aria-required") === "true";
        if (!required) continue;
        const value = "value" in el ? String(el.value || "").trim() : "";
        if (!value) {
          emptyRequiredTextFields += 1;
          details.push(
            "Empty required field: " +
              el.tagName.toLowerCase() +
              " name=" +
              (el.getAttribute("name") || ""),
          );
        }
      }
    }
    let emptyTextAreas = 0;
    for (const root of roots) {
      for (const el of root.querySelectorAll("textarea")) {
        if (!isVisible(el)) continue;
        const required = el.hasAttribute("required") || el.getAttribute("aria-required") === "true";
        const value = String(el.value || "").trim();
        if (required && !value) {
          emptyTextAreas += 1;
          details.push("Empty required textarea");
        }
      }
    }
    let uncheckedRequiredCheckboxes = 0;
    for (const root of roots) {
      for (const el of root.querySelectorAll('input[type="checkbox"]')) {
        if (!isVisible(el)) continue;
        const required = el.hasAttribute("required") || el.getAttribute("aria-required") === "true";
        if (required && !el.checked) {
          uncheckedRequiredCheckboxes += 1;
          details.push("Unchecked required checkbox: " + (el.getAttribute("name") || ""));
        }
      }
    }
    let ariaInvalidCount = 0;
    for (const root of roots) {
      for (const el of root.querySelectorAll('[aria-invalid="true"]')) {
        if (!isVisible(el)) continue;
        ariaInvalidCount += 1;
        details.push("aria-invalid on " + el.tagName.toLowerCase());
      }
    }
    const domHints = {
      emptyRequiredTextFields,
      emptyTextAreas,
      uncheckedRequiredCheckboxes,
      ariaInvalidCount,
      details: details.slice(0, 50),
    };
    const imageHints = [];
    for (const root of roots) {
      for (const img of root.querySelectorAll("img")) {
        if (!isVisible(img)) continue;
        const hint = { alt: img.alt || "", src: img.currentSrc || img.src };
        const ariaLabel = img.getAttribute("aria-label");
        if (ariaLabel) hint.ariaLabel = ariaLabel;
        if (img.title) hint.title = img.title;
        if (hint.alt || hint.ariaLabel || hint.title) imageHints.push(hint);
      }
    }
    const links = [];
    for (const root of roots) {
      for (const a of root.querySelectorAll("a[href]")) {
        const text = (a.textContent || "").replace(/\\s+/g, " ").trim();
        const href = a.href;
        if (!href) continue;
        const download = a.getAttribute("download");
        const entry = { text, href };
        if (download && download.trim()) entry.download = download.trim();
        links.push(entry);
      }
    }
    return { visibleText, domHints, imageHints, links };
  })()`;

  const { visibleText, domHints, imageHints, links } = await page.evaluate<{
    visibleText: string;
    domHints: DomCompletionHints;
    imageHints: ImageHint[];
    links: { text: string; href: string; download?: string }[];
  }>(captureExpression);

  const snapshot: PageSnapshot = {
    title,
    url,
    capturedAtIso,
    visibleText,
    links: links.slice(0, MAX_SNAPSHOT_LINKS),
    domHints,
    imageHints,
    subtitles: [],
    linkedPdfs: [],
    panoptoCaptions: [],
  };

  if (o.fetchSubtitles) {
    const refs = await collectSubtitleTrackRefs(page, o.contentScope);
    snapshot.subtitles = await fetchSubtitleCaptions(page.context().request, refs, {
      maxBytesPerFile: o.subtitleMaxBytesPerFile,
      maxFiles: o.subtitleMaxFiles,
    });
  }

  if (o.fetchPdfs) {
    const docOpts = {
      maxPdfBytes: o.maxPdfBytes,
      maxPdfsPerPage: o.maxPdfsPerPage,
      pdfPreviewChars: o.pdfPreviewChars,
    };
    snapshot.linkedPdfs = await extractLinkedDocumentSnippets(page, snapshot.links, docOpts);
    if (o.digPebblePadViewerDocuments) {
      const viewerOpts = {
        ...docOpts,
        maxViewerDigestsPerSnapshot: o.maxViewerDigestsPerSnapshot,
        viewerSpinnerWaitMs: o.viewerSpinnerWaitMs,
        viewerSettleMs: o.viewerSettleMs,
        viewerGotoTimeoutMs: o.viewerGotoTimeoutMs,
      };
      const fromViewers = await extractLinkedDocumentsFromPebblePadViewerPages(
        page,
        snapshot.links,
        viewerOpts,
        snapshot.linkedPdfs,
      );
      snapshot.linkedPdfs = [...snapshot.linkedPdfs, ...fromViewers];
    }
  }

  if (o.fetchPanopto) {
    snapshot.panoptoCaptions = await extractPanoptoCaptions(page.context().request, snapshot.links, {
      maxSessions: o.panoptoMaxSessions,
      maxBytesPerFile: o.panoptoMaxBytesPerFile,
      timeout: o.panoptoTimeout,
    }, page);
  }

  return snapshot;
}
