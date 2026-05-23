import fs from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import { stdin as input } from "node:process";

import {
  collectCrawlCandidateHrefs,
  type CrawlNavigateWaitUntil,
} from "../browser/crawlDiscovery.js";
import { launchSupervisedContext } from "../browser/context.js";
import { resolveLiveWalkPage } from "../browser/livePage.js";
import type { CaptureQuality } from "../extract/domSummary.js";
import type { CapturePageOptions } from "../extract/pageSnapshotTypes.js";
import { captureRichPage } from "../extract/richCapture.js";
import { MAX_SNAPSHOT_LINKS } from "../extract/snapshot.js";
import { sleep } from "../lib/sleep.js";
import {
  pageHtmlBasename,
  sessionDomDir,
  urlCaptureSlug,
} from "../lib/htmlCapturePaths.js";
import { writeRichCaptureFiles } from "../lib/writeRichCapture.js";
import {
  defaultPebblePadWorkbookLinkScope,
  defaultWalkPrefixForUrl,
  isAllowedWalkTarget,
  normalizeCrawlUrlKey,
  resolveCrawlLinkScope,
  shouldSkipLinkForCrawl,
} from "../lib/url.js";
import { isPlaywrightTargetClosedError } from "../lib/playwrightClosed.js";
import { waitForEnter } from "../lib/waitForEnter.js";
import type { WalkDiagnostics } from "./walk.js";

export type { DomSummary } from "../extract/domSummary.js";

export type DomCaptureManifestEntry = {
  index: number;
  title: string;
  url: string;
  slug: string;
  captureQuality: CaptureQuality;
  htmlPath: string;
  summaryPath: string;
  contentPath: string;
  snapshotPath: string;
  linkedDocuments: Array<{ relPath: string; url: string; format?: string }>;
};

export type DomCaptureManifest = {
  kind: "pebblepad-dom-crawl";
  version: 2;
  sessionStamp: string;
  sessionDir: string;
  startedFromUrl: string;
  walkPrefix: string;
  preserveHash: boolean;
  fetchDocuments: boolean;
  contentWaitMs: number;
  includeViewerPages: boolean;
  maxPages: number | null;
  pageDelayMs: number;
  settleMs: number;
  spinnerWaitMs: number;
  captures: DomCaptureManifestEntry[];
  diagnostics?: WalkDiagnostics;
};

function makeSessionStamp(): string {
  return new Date().toISOString().replaceAll(":", "").replaceAll(".", "");
}

function captureOptionsFrom(args: {
  fetchDocuments: boolean;
  skipSubtitles?: boolean;
  skipPanopto?: boolean;
}): Partial<CapturePageOptions> {
  return {
    fetchSubtitles: args.skipSubtitles !== true,
    fetchPdfs: args.fetchDocuments,
    fetchPanopto: args.skipPanopto !== true,
    digPebblePadViewerDocuments: args.fetchDocuments,
  };
}

export async function runCaptureDom(args: {
  userDataDir: string;
  baseUrl: string;
  slowMoMs: number;
  outDir: string;
  settleMs: number;
  spinnerWaitMs: number;
  contentWaitMs: number;
  fetchDocuments: boolean;
  skipSubtitles?: boolean;
  skipPanopto?: boolean;
  single: boolean;
  maxPages: number | null;
  pageDelayMs: number;
  siteWide: boolean;
  urlPrefix: string | null;
  preserveHash: boolean;
  autoScroll: boolean;
  scrollPauseMs: number;
  navWaitUntil: CrawlNavigateWaitUntil;
  sharedHostSuffix: string | null;
  linkScope: string | null;
  includeViewerPages: boolean;
  logQueue?: boolean;
}): Promise<void> {
  if (!input.isTTY) {
    throw new Error("capture-dom requires an interactive terminal so you can confirm login with Enter.");
  }

  const richPass = {
    spinnerWaitMs: args.spinnerWaitMs,
    autoScroll: args.autoScroll,
    scrollPauseMs: args.scrollPauseMs,
    settleMs: args.settleMs,
    contentWaitMs: args.contentWaitMs,
    capture: captureOptionsFrom(args),
  };

  const context = await launchSupervisedContext({
    userDataDir: args.userDataDir,
    slowMoMs: args.slowMoMs,
  });

  try {
    let page = context.pages()[0] ?? (await context.newPage());
    await page.goto(args.baseUrl, { waitUntil: args.navWaitUntil });

    if (args.single) {
      console.log(
        [
          "Browser opened using your saved profile.",
          "1) Log in to PebblePad and open the page to capture.",
          "2) Press Enter here once the page has finished loading.",
          "",
          "Saves: page.html, content.txt (visible text + linked PDF/DOCX text), snapshot.json, linked-docs/",
        ].join("\n"),
      );

      await waitForEnter("\nPress Enter to capture… ");

      const live = resolveLiveWalkPage(context, page, "capture-dom");
      if (!live) {
        console.error("\n[capture-dom] No open browser tabs found.\n");
        return;
      }
      page = live;

      await captureAndWriteOne(page, args, richPass);
      return;
    }

    console.log(
      [
        "Browser opened using your saved profile.",
        "1) Log in and navigate to your workbook starting page.",
        "2) Press Enter once to start the crawl.",
        "",
        "Each page saves HTML plus content.txt (workbook text + downloaded briefs).",
        "Viewer/asset routes are skipped in the crawl; linked files are fetched from workbook pages.",
        args.fetchDocuments
          ? "Linked PDF/DOCX/PPTX downloads: enabled."
          : "Linked document downloads: disabled (--skip-documents).",
        args.maxPages == null
          ? `No page cap · contentWait=${args.contentWaitMs}ms · spinnerWait=${args.spinnerWaitMs}ms · settle=${args.settleMs}ms`
          : `Max ${args.maxPages} pages · contentWait=${args.contentWaitMs}ms`,
      ].join("\n"),
    );

    await waitForEnter("\nPress Enter to start automatic capture… ");

    const live = resolveLiveWalkPage(context, page, "capture-dom");
    if (!live) {
      console.error("\n[capture-dom] No open browser tabs found.\n");
      return;
    }
    page = live;

    const startUrl = page.url();
    const startOrigin = new URL(startUrl).origin;
    const startHostname = new URL(startUrl).hostname;
    const linkScope = resolveCrawlLinkScope(startUrl, args.linkScope);

    if (!args.linkScope?.trim() && defaultPebblePadWorkbookLinkScope(startUrl) !== null) {
      console.log(`[capture-dom] Workbook link scope: ${linkScope.selector}`);
    }

    if (!args.sharedHostSuffix && /pebblepad\.co\.uk$/i.test(startHostname)) {
      console.warn(
        "[capture-dom] Tip: add --shared-host-suffix pebblepad.co.uk and --preserve-hash for full workbook crawls.",
      );
    }

    const walkPrefix = args.siteWide
      ? `${startOrigin}/`
      : (args.urlPrefix ?? defaultWalkPrefixForUrl(startUrl));

    const pageCap = args.maxPages ?? Number.POSITIVE_INFINITY;
    const sessionStamp = makeSessionStamp();
    const sessionDir = sessionDomDir(args.outDir, sessionStamp);
    const pagesDir = path.join(sessionDir, "pages");
    await fs.mkdir(pagesDir, { recursive: true });

    const queue: string[] = [];
    const queued = new Set<string>();
    const startKey = normalizeCrawlUrlKey(startUrl, args.preserveHash);
    queue.push(startKey);
    queued.add(startKey);

    const visited = new Set<string>();
    const manifest: DomCaptureManifest = {
      kind: "pebblepad-dom-crawl",
      version: 2,
      sessionStamp,
      sessionDir,
      startedFromUrl: startUrl,
      walkPrefix,
      preserveHash: args.preserveHash,
      fetchDocuments: args.fetchDocuments,
      contentWaitMs: args.contentWaitMs,
      includeViewerPages: args.includeViewerPages,
      maxPages: args.maxPages,
      pageDelayMs: args.pageDelayMs,
      settleMs: args.settleMs,
      spinnerWaitMs: args.spinnerWaitMs,
      captures: [],
    };

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

    const skipOpts = { allowViewerRoutes: args.includeViewerPages };
    let captured = 0;

    while (queue.length > 0 && captured < pageCap) {
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
            `[capture-dom] Navigation failed: ${nextKey}\n${err instanceof Error ? err.message : String(err)}`,
          );
          visited.add(nextKey);
          continue;
        }
      }
      visited.add(nextKey);
      await sleep(args.pageDelayMs);

      try {
        const livePage = resolveLiveWalkPage(context, page, "capture-dom");
        if (!livePage) {
          diagnostics.stopReason = "browser-closed";
          break;
        }
        page = livePage;

        const rich = await captureRichPage(page, richPass);
        diagnostics.spinnerPhaseTimeouts += rich.pause.spinnerTimedOutPhases;

        const hrefs = await collectCrawlCandidateHrefs(page, MAX_SNAPSHOT_LINKS, linkScope.selector, {
          fallbackToDocumentWhenEmpty: !linkScope.strict,
        });
        diagnostics.linksConsidered += hrefs.length;

        captured += 1;
        const slug = urlCaptureSlug(rich.domSummary.url, args.preserveHash);
        const baseName = pageHtmlBasename(captured, slug);
        const written = await writeRichCaptureFiles({
          pagesDir,
          baseName,
          rich,
          domSummary: rich.domSummary,
        });

        manifest.captures.push({
          index: captured,
          title: rich.domSummary.title,
          url: rich.domSummary.url,
          slug,
          captureQuality: rich.quality,
          htmlPath: written.htmlRel,
          summaryPath: written.summaryRel,
          contentPath: written.contentRel,
          snapshotPath: written.snapshotRel,
          linkedDocuments: written.linkedDocs,
        });

        const progress = args.maxPages == null ? `${captured}` : `${captured}/${args.maxPages}`;
        console.log(
          `Captured (${progress}) [${rich.quality}]: ${rich.domSummary.url} · ${written.linkedDocs.length} linked doc(s)`,
        );

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

          if (shouldSkipLinkForCrawl(href, skipOpts)) {
            diagnostics.filteredOutOfScope += 1;
            continue;
          }

          const key = normalizeCrawlUrlKey(href, args.preserveHash);
          if (visited.has(key) || queued.has(key)) continue;
          queued.add(key);
          queue.push(key);
          diagnostics.newlyEnqueued += 1;
        }

        diagnostics.maxQueueDepthObserved = Math.max(diagnostics.maxQueueDepthObserved, queue.length);
        if (args.logQueue) {
          console.log(`[capture-dom] queue: ${queue.length}`);
        }
      } catch (err: unknown) {
        if (isPlaywrightTargetClosedError(err)) {
          diagnostics.stopReason = "browser-closed";
          console.error("\n[capture-dom] Browser closed during capture.\n");
          break;
        }
        throw err;
      }
    }

    diagnostics.pagesCaptured = manifest.captures.length;
    diagnostics.queueRemaining = queue.length;
    if (diagnostics.stopReason !== "browser-closed") {
      diagnostics.stopReason =
        args.maxPages != null && manifest.captures.length >= pageCap ? "max-pages" : "queue-empty";
    }
    manifest.diagnostics = diagnostics;

    if (manifest.captures.length === 0) return;

    const manifestPath = path.join(sessionDir, "manifest.json");
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const qualityCounts = manifest.captures.reduce(
      (acc, c) => {
        acc[c.captureQuality] = (acc[c.captureQuality] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(
      [
        "",
        `Finished: ${manifest.captures.length} page(s) → ${sessionDir}`,
        `Manifest: ${manifestPath}`,
        `Quality: ${JSON.stringify(qualityCounts)}`,
        "",
        "Open content.txt per page for readable requirements (includes linked PDF/DOCX text).",
        "Pages marked placeholder-only still have empty student forms — check linked-docs/ on that page.",
      ].join("\n"),
    );
  } finally {
    await context.close();
  }
}

async function captureAndWriteOne(
  page: Page,
  args: { outDir: string; preserveHash: boolean },
  richPass: Parameters<typeof captureRichPage>[1],
) {
  const rich = await captureRichPage(page, richPass);
  const sessionStamp = makeSessionStamp();
  const sessionDir = sessionDomDir(args.outDir, sessionStamp);
  const pagesDir = path.join(sessionDir, "pages");
  const slug = urlCaptureSlug(rich.domSummary.url, args.preserveHash);
  const baseName = pageHtmlBasename(1, slug);
  const written = await writeRichCaptureFiles({
    pagesDir,
    baseName,
    rich,
    domSummary: rich.domSummary,
  });

  const manifest: DomCaptureManifest = {
    kind: "pebblepad-dom-crawl",
    version: 2,
    sessionStamp,
    sessionDir,
    startedFromUrl: rich.domSummary.url,
    walkPrefix: rich.domSummary.url,
    preserveHash: args.preserveHash,
    fetchDocuments: true,
    contentWaitMs: richPass.contentWaitMs,
    includeViewerPages: false,
    maxPages: 1,
    pageDelayMs: 0,
    settleMs: richPass.settleMs,
    spinnerWaitMs: richPass.spinnerWaitMs,
    captures: [
      {
        index: 1,
        title: rich.domSummary.title,
        url: rich.domSummary.url,
        slug,
        captureQuality: rich.quality,
        htmlPath: written.htmlRel,
        summaryPath: written.summaryRel,
        contentPath: written.contentRel,
        snapshotPath: written.snapshotRel,
        linkedDocuments: written.linkedDocs,
      },
    ],
  };

  await fs.writeFile(
    path.join(sessionDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(
    [
      `Session: ${sessionDir}`,
      `Quality: ${rich.quality}`,
      `content.txt: ${written.contentPath}`,
      `HTML: ${written.htmlPath}`,
      `Linked docs: ${written.linkedDocs.length}`,
    ].join("\n"),
  );
}
