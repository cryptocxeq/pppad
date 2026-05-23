import type { Page } from "playwright";

import {
  collectCrawlCandidateHrefs,
  pauseForCrawlCapture,
  type CrawlNavigateWaitUntil,
} from "../browser/crawlDiscovery.js";
import { launchSupervisedContext } from "../browser/context.js";
import { resolveLiveWalkPage } from "../browser/livePage.js";
import { analyzeVisibleText } from "../extract/heuristics.js";
import { mergeTextForAnalysis } from "../extract/mergeText.js";
import {
  capturePageSnapshot,
  type CapturePageOptions,
  defaultCapturePageOptions,
  MAX_SNAPSHOT_LINKS,
} from "../extract/snapshot.js";
import { isPlaywrightTargetClosedError } from "../lib/playwrightClosed.js";
import { sleep } from "../lib/sleep.js";
import {
  defaultPebblePadWorkbookLinkScope,
  defaultWalkPrefixForUrl,
  isAllowedWalkTarget,
  normalizeCrawlUrlKey,
  resolveCrawlLinkScope,
} from "../lib/url.js";
import { waitForEnter } from "../lib/waitForEnter.js";
import { writeRequirementReportArtifacts } from "../lib/writeArtifacts.js";
import { buildWorkbookReport } from "../report/buildFromSnapshot.js";

export type WalkDiagnostics = {
  stopReason: "max-pages" | "queue-empty" | "browser-closed";
  pagesCaptured: number;
  /** `null` means there was no page cap (crawl ran until the queue was empty). */
  maxPages: number | null;
  queueRemaining: number;
  dequeueSkippedVisited: number;
  linksConsidered: number;
  filteredOutOfScope: number;
  newlyEnqueued: number;
  navigationFailures: number;
  preserveHash: boolean;
  autoScroll: boolean;
  navWaitUntil: CrawlNavigateWaitUntil;
  sharedHostSuffix: string | null;
  pageDelayMs: number;
  settleMs: number;
  scrollPauseMs: number;
  /** Max time to wait for PebblePad loading UI to clear (each of two phases per page). */
  spinnerWaitMs: number;
  /** Count of spinner-wait phases that hit the timeout (up to 2 per captured page). */
  spinnerPhaseTimeouts: number;
  /** Largest `queue.length` observed after processing a page (enqueue wave included). */
  maxQueueDepthObserved: number;
  linkScopeRequested: string | null;
  effectiveLinkScope: string | null;
  strictLinkScope: boolean;
};

export async function runWalk(args: {
  userDataDir: string;
  baseUrl: string;
  slowMoMs: number;
  workbookTitle: string;
  outDir: string;
  maxPages: number | null;
  pageDelayMs: number;
  settleMs: number;
  siteWide: boolean;
  urlPrefix: string | null;
  capture: Partial<CapturePageOptions>;
  preserveHash: boolean;
  autoScroll: boolean;
  scrollPauseMs: number;
  navWaitUntil: CrawlNavigateWaitUntil;
  sharedHostSuffix: string | null;
  linkScope: string | null;
  spinnerWaitMs: number;
  /** When true, log `queue.length` after each captured page. */
  logQueue?: boolean;
}): Promise<void> {
  const pageCap = args.maxPages ?? Number.POSITIVE_INFINITY;
  const context = await launchSupervisedContext({
    userDataDir: args.userDataDir,
    slowMoMs: args.slowMoMs,
  });

  try {
    let page = context.pages()[0] ?? (await context.newPage());
    await page.goto(args.baseUrl, { waitUntil: args.navWaitUntil });

    console.log(
      [
        "Browser opened using your saved profile.",
        "Navigate to the workbook/area you want to crawl, then press Enter to begin a slow, supervised walk.",
        "",
        args.maxPages == null
          ? `No page cap (crawls until the in-scope link queue is empty), ${args.pageDelayMs}ms after navigation, spinnerWait=${args.spinnerWaitMs}ms (×2 per page around scroll-prep), ${args.settleMs}ms settle after that, navWait=${args.navWaitUntil}.`
          : `At most ${args.maxPages} page(s), ${args.pageDelayMs}ms after navigation, spinnerWait=${args.spinnerWaitMs}ms (×2 per page around scroll-prep), ${args.settleMs}ms settle after that, navWait=${args.navWaitUntil}.`,
        `Discovery: autoScroll=${args.autoScroll}, scrollPauseMs=${args.scrollPauseMs}, preserveHash=${args.preserveHash} (link scope is chosen after you press Enter from the current URL).`,
        "This crawler only follows normal links it can discover in the DOM (no clicking / no AI).",
      ].join("\n"),
    );

    await waitForEnter("\nPress Enter to start walking from the current page… ");

    {
      const live = resolveLiveWalkPage(context, page, "walk");
      if (live === null) {
        console.error(
          "\n[walk] No open browser tabs found after you pressed Enter (the supervised window may have been closed).\n",
        );
        return;
      }
      page = live;
    }

    const startUrl = page.url();
    const startOrigin = new URL(startUrl).origin;
    const startHostname = new URL(startUrl).hostname;
    const linkScope = resolveCrawlLinkScope(startUrl, args.linkScope);

    if (!args.linkScope?.trim() && defaultPebblePadWorkbookLinkScope(startUrl) != null) {
      console.log(
        `[walk] Default workbook link scope: ${linkScope.selector} (strict — quick nav + workbook canvas only; open Quick Navigation if nav links are missing).`,
      );
    }

    if (!args.sharedHostSuffix && /pebblepad\.co\.uk$/i.test(startHostname)) {
      console.warn(
        [
          "",
          "[walk] PebblePad often splits UI across subdomains (e.g. v3.* and atlas.*).",
          "If the crawl stops early, add: --shared-host-suffix pebblepad.co.uk",
          "",
        ].join("\n"),
      );
    }

    const walkPrefix = args.siteWide
      ? `${startOrigin}/`
      : (args.urlPrefix ?? defaultWalkPrefixForUrl(startUrl));

    const queue: string[] = [];
    const queued = new Set<string>();
    const startKey = normalizeCrawlUrlKey(startUrl, args.preserveHash);
    queue.push(startKey);
    queued.add(startKey);

    const visited = new Set<string>();
    const pages: Array<{
      snapshot: Awaited<ReturnType<typeof capturePageSnapshot>>;
      analysis: ReturnType<typeof analyzeVisibleText>;
    }> = [];

    const diagnostics: WalkDiagnostics = {
      stopReason: "queue-empty",
      pagesCaptured: 0,
      maxPages: args.maxPages,
      queueRemaining: 0,
      dequeueSkippedVisited: 0,
      linksConsidered: 0,
      filteredOutOfScope: 0,
      newlyEnqueued: 0,
      navigationFailures: 0,
      preserveHash: args.preserveHash,
      autoScroll: args.autoScroll,
      navWaitUntil: args.navWaitUntil,
      sharedHostSuffix: args.sharedHostSuffix,
      pageDelayMs: args.pageDelayMs,
      settleMs: args.settleMs,
      scrollPauseMs: args.scrollPauseMs,
      spinnerWaitMs: args.spinnerWaitMs,
      spinnerPhaseTimeouts: 0,
      linkScopeRequested: args.linkScope,
      effectiveLinkScope: linkScope.selector,
      strictLinkScope: linkScope.strict,
      maxQueueDepthObserved: queue.length,
    };

    while (queue.length > 0 && pages.length < pageCap) {
      const nextKey = queue.shift()!;
      if (visited.has(nextKey)) {
        diagnostics.dequeueSkippedVisited += 1;
        continue;
      }

      const alreadyHere = normalizeCrawlUrlKey(page.url(), args.preserveHash) === nextKey;
      if (!alreadyHere) {
        try {
          await page.goto(nextKey, { waitUntil: args.navWaitUntil });
        } catch (err) {
          diagnostics.navigationFailures += 1;
          console.error(
            `[walk] Navigation failed: ${nextKey}\n${err instanceof Error ? err.message : String(err)}`,
          );
          visited.add(nextKey);
          continue;
        }
      }
      visited.add(nextKey);

      await sleep(args.pageDelayMs);

      try {
        const live = resolveLiveWalkPage(context, page, "walk");
        if (live === null) {
          diagnostics.stopReason = "browser-closed";
          console.error(
            [
              "",
              "[walk] No open browser tabs remain; stopping the crawl.",
              pages.length > 0 ? `Partial: ${pages.length} page(s) were captured earlier.` : "No pages were captured.",
              "",
            ].join("\n"),
          );
          break;
        }
        page = live;

        const { spinnerTimedOutPhases } = await pauseForCrawlCapture(page, {
          spinnerWaitMs: args.spinnerWaitMs,
          autoScroll: args.autoScroll,
          scrollPauseMs: args.scrollPauseMs,
          settleMs: args.settleMs,
        });
        diagnostics.spinnerPhaseTimeouts += spinnerTimedOutPhases;

        const hrefs = await collectCrawlCandidateHrefs(page, MAX_SNAPSHOT_LINKS, linkScope.selector, {
          fallbackToDocumentWhenEmpty: !linkScope.strict,
        });
        diagnostics.linksConsidered += hrefs.length;

        const captureOpts: CapturePageOptions = { ...defaultCapturePageOptions, ...args.capture };
        const snapshot = await capturePageSnapshot(page, captureOpts);
        const merged = mergeTextForAnalysis(snapshot);
        const analysis = analyzeVisibleText(merged);
        pages.push({ snapshot, analysis });

        const progress = args.maxPages == null ? `${pages.length}` : `${pages.length}/${args.maxPages}`;
        console.log(`Captured (${progress}): ${snapshot.url}`);

        for (const href of hrefs) {
          if (
            !isAllowedWalkTarget(href, {
              startOrigin,
              startHostname,
              sameOriginOnly: true,
              urlPrefix: walkPrefix,
              sharedHostSuffix: args.sharedHostSuffix,
            })
          ) {
            diagnostics.filteredOutOfScope += 1;
            continue;
          }

          const key = normalizeCrawlUrlKey(href, args.preserveHash);
          if (visited.has(key)) continue;
          if (queued.has(key)) continue;
          queued.add(key);
          queue.push(key);
          diagnostics.newlyEnqueued += 1;
        }
        diagnostics.maxQueueDepthObserved = Math.max(diagnostics.maxQueueDepthObserved, queue.length);
        if (args.logQueue) {
          console.log(
            `[walk] queue pending: ${queue.length} (peak ${diagnostics.maxQueueDepthObserved}, visited ${visited.size})`,
          );
        }
      } catch (err: unknown) {
        if (isPlaywrightTargetClosedError(err)) {
          diagnostics.stopReason = "browser-closed";
          console.error(
            [
              "",
              "[walk] The supervised browser was closed (or crashed) during capture — stopping the crawl.",
              pages.length > 0
                ? `Writing a partial report with ${pages.length} page(s) already captured.`
                : "No pages were captured; no report file will be written.",
              "",
            ].join("\n"),
          );
          break;
        }
        throw err;
      }
    }

    diagnostics.pagesCaptured = pages.length;
    diagnostics.queueRemaining = queue.length;
    if (diagnostics.stopReason !== "browser-closed") {
      diagnostics.stopReason =
        args.maxPages != null && pages.length >= pageCap ? "max-pages" : "queue-empty";
    }

    if (pages.length === 0 && diagnostics.stopReason === "browser-closed") {
      console.error("[walk] Exiting without writing a report.");
      return;
    }

    const report = buildWorkbookReport({ workbookTitle: args.workbookTitle, pages });
    const stamp = report.generatedAtIso.replaceAll(":", "").replaceAll(".", "");
    const baseName = `pebblepad-walk-${stamp}`;

    const { mdPath, jsonPath } = await writeRequirementReportArtifacts({
      report,
      jsonPayload: { report, pages, diagnostics },
      outDir: args.outDir,
      baseName,
    });

    console.log(`Wrote:\n- ${mdPath}\n- ${jsonPath}`);
    console.log(
      [
        "",
        `[walk] Crawl summary: stop=${diagnostics.stopReason}`,
        `- captured: ${diagnostics.pagesCaptured} page(s)${diagnostics.maxPages != null ? ` (cap ${diagnostics.maxPages})` : ""}`,
        `- queueRemaining: ${diagnostics.queueRemaining}`,
        `- maxQueueDepthObserved: ${diagnostics.maxQueueDepthObserved}`,
        `- linksConsidered: ${diagnostics.linksConsidered}`,
        `- filteredOutOfScope: ${diagnostics.filteredOutOfScope}`,
        `- newlyEnqueued: ${diagnostics.newlyEnqueued}`,
        `- dequeueSkippedVisited: ${diagnostics.dequeueSkippedVisited}`,
        `- navigationFailures: ${diagnostics.navigationFailures}`,
        `- spinnerPhaseTimeouts: ${diagnostics.spinnerPhaseTimeouts} (max 2× per captured page when PebblePad loading UI is slow)`,
        `- linkScope: ${diagnostics.effectiveLinkScope ?? "(full document)"}${diagnostics.strictLinkScope ? " (strict)" : ""}`,
      ].join("\n"),
    );
  } finally {
    await context.close();
  }
}
