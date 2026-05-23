#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";

import type { CrawlNavigateWaitUntil } from "./browser/crawlDiscovery.js";
import { defaultUserDataDir, launchSupervisedContext } from "./browser/context.js";
import { cappedPositiveInt, intInRange } from "./lib/cliNumbers.js";
import { runCaptureDom } from "./commands/captureDom.js";
import { runOpen } from "./commands/open.js";
import { runScan } from "./commands/scan.js";
import { runWalk } from "./commands/walk.js";
import type { CapturePageOptions } from "./extract/pageSnapshotTypes.js";

function envBaseUrl(): string {
  return process.env.PEBBLEPAD_BASE_URL ?? "https://www.pebblepad.co.uk/";
}

function captureOptionsFrom(flags: {
  skipSubtitles?: boolean;
  skipPdfs?: boolean;
  contentScope?: string;
  skipViewerDig?: boolean;
}): Partial<CapturePageOptions> {
  return {
    fetchSubtitles: flags.skipSubtitles !== true,
    fetchPdfs: flags.skipPdfs !== true,
    contentScope: flags.contentScope?.trim() ? flags.contentScope.trim() : null,
    digPebblePadViewerDocuments: flags.skipViewerDig !== true,
  };
}

function parseNavWait(raw: string | undefined): CrawlNavigateWaitUntil {
  const v = (raw ?? "domcontentloaded").toLowerCase();
  if (v === "load" || v === "networkidle" || v === "domcontentloaded") return v;
  console.warn(`[cli] Unknown --nav-wait "${raw ?? ""}", using domcontentloaded`);
  return "domcontentloaded";
}

const program = new Command();
program
  .name("pebblepad-req")
  .description(
    "Supervised PebblePad assistant: open a normal browser session and capture visible requirements into local reports.",
  )
  .option(
    "-p, --profile-dir <path>",
    "Persistent browser profile directory (cookies/local storage are stored here)",
    defaultUserDataDir(),
  )
  .option(
    "--slow-mo-ms <ms>",
    "Playwright slow motion delay between actions",
    (v) => intInRange(v, 250, 0, 60_000),
    250,
  )
  .option("--base-url <url>", "Starting URL (also reads PEBBLEPAD_BASE_URL)", envBaseUrl());

program
  .command("doctor")
  .description("Verify Playwright can launch a supervised Chromium build")
  .action(async () => {
    const opts = program.opts<{
      profileDir: string;
      slowMoMs: number;
    }>();

    const context = await launchSupervisedContext({
      userDataDir: opts.profileDir,
      slowMoMs: opts.slowMoMs,
    });

    try {
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto("about:blank");
      console.log("doctor: OK (launched persistent context and opened about:blank)");
    } finally {
      await context.close();
    }
  });

program
  .command("open")
  .description("Open PebblePad in a normal browser window and wait until you end the session")
  .action(async () => {
    const opts = program.opts<{
      profileDir: string;
      slowMoMs: number;
      baseUrl: string;
    }>();

    await runOpen({
      userDataDir: opts.profileDir,
      baseUrl: opts.baseUrl,
      slowMoMs: opts.slowMoMs,
    });
  });

program
  .command("capture-dom")
  .description(
    "Log in manually once, then automatically crawl + save full-page HTML + structural summaries (or use --single)",
  )
  .option("-o, --out-dir <path>", "Output directory", path.join(process.cwd(), "out"))
  .option(
    "--settle-ms <n>",
    "After PebblePad loading UI clears and scroll-prep, wait this many ms before link harvest / DOM capture (extra SPA cushion)",
    (v) => intInRange(v, 750, 0, 600_000),
    750,
  )
  .option(
    "--spinner-wait-ms <n>",
    "Max wait per phase for PebblePad `.app-spinner-wrapper` to clear (twice per page around scroll-prep); 0 disables",
    (v) => intInRange(v, 180_000, 0, 600_000),
    180_000,
  )
  .option("--single", "Only capture the current page after login (no automatic crawling)")
  .option(
    "--max-pages <n>",
    "Optional hard cap on pages (default: crawl until the in-scope link queue is empty)",
    (v) => cappedPositiveInt(v, 500_000),
  )
  .option(
    "--page-delay-ms <n>",
    "Delay after each navigation before settle/capture",
    (v) => intInRange(v, 1200, 0, 600_000),
    1200,
  )
  .option(
    "--site-wide",
    "Within the same origin, follow links across the entire site (not just the current path prefix)",
  )
  .option(
    "--url-prefix <url>",
    "Only follow URLs under this prefix path (defaults to the starting page path; overridden by --site-wide)",
  )
  .option(
    "--preserve-hash",
    "Keep URL #fragments when de-duplicating/queueing (useful for some hash-router SPAs)",
  )
  .option("--no-auto-scroll", "Disable scrolling to reveal lazy-loaded links/menus before discovery")
  .option(
    "--scroll-pause-ms <n>",
    "After auto-scroll, wait this long for lazy content to mount",
    (v) => intInRange(v, 400, 0, 600_000),
    400,
  )
  .option(
    "--nav-wait <mode>",
    "Playwright navigation waitUntil: domcontentloaded | load | networkidle",
    "domcontentloaded",
  )
  .option(
    "--shared-host-suffix <suffix>",
    "Allow crawling links on other subdomains of this suffix (e.g. pebblepad.co.uk for v3 + atlas hosts)",
  )
  .option(
    "--link-scope <selector>",
    "CSS selector to restrict link discovery (PebblePad workbooks default to quick nav + .workbook-builder-wrapper)",
  )
  .option(
    "--log-queue",
    "After each captured page, print how many URLs are still waiting in the crawl queue",
  )
  .option(
    "--content-wait-ms <n>",
    "After spinners clear, wait up to this long for workbook brief text to replace placeholder UI",
    (v) => intInRange(v, 45_000, 0, 600_000),
    45_000,
  )
  .option(
    "--skip-documents",
    "Do not download linked PDF/DOCX/PPTX or open viewer tabs to harvest briefs",
  )
  .option(
    "--include-viewer-pages",
    "Also crawl #/viewer/... URLs as separate pages (usually worse than linked-docs from workbook pages)",
  )
  .option("--skip-subtitles", "Do not fetch WebVTT/SRT sidecars during rich capture")
  .option("--skip-panopto", "Do not fetch Panopto captions during rich capture")
  .action(
    async (cmdOpts: {
      outDir: string;
      settleMs: number;
      spinnerWaitMs: number;
      contentWaitMs: number;
      skipDocuments?: boolean;
      includeViewerPages?: boolean;
      skipSubtitles?: boolean;
      skipPanopto?: boolean;
      single?: boolean;
      maxPages?: number;
      pageDelayMs: number;
      siteWide?: boolean;
      urlPrefix?: string;
      preserveHash?: boolean;
      noAutoScroll?: boolean;
      scrollPauseMs: number;
      navWait: string;
      sharedHostSuffix?: string;
      linkScope?: string;
      logQueue?: boolean;
    }) => {
      const opts = program.opts<{
        profileDir: string;
        slowMoMs: number;
        baseUrl: string;
      }>();

      await runCaptureDom({
        userDataDir: opts.profileDir,
        baseUrl: opts.baseUrl,
        slowMoMs: opts.slowMoMs,
        outDir: cmdOpts.outDir,
        settleMs: cmdOpts.settleMs,
        spinnerWaitMs: cmdOpts.spinnerWaitMs,
        single: cmdOpts.single === true,
        maxPages: cmdOpts.maxPages !== undefined ? cmdOpts.maxPages : null,
        pageDelayMs: cmdOpts.pageDelayMs,
        siteWide: cmdOpts.siteWide === true,
        urlPrefix: cmdOpts.urlPrefix ?? null,
        preserveHash: cmdOpts.preserveHash === true,
        autoScroll: cmdOpts.noAutoScroll !== true,
        scrollPauseMs: cmdOpts.scrollPauseMs,
        navWaitUntil: parseNavWait(cmdOpts.navWait),
        sharedHostSuffix: cmdOpts.sharedHostSuffix?.trim() ? cmdOpts.sharedHostSuffix.trim() : null,
        linkScope: cmdOpts.linkScope?.trim() ? cmdOpts.linkScope.trim() : null,
        logQueue: cmdOpts.logQueue === true,
        contentWaitMs: cmdOpts.contentWaitMs,
        fetchDocuments: cmdOpts.skipDocuments !== true,
        skipSubtitles: cmdOpts.skipSubtitles === true,
        skipPanopto: cmdOpts.skipPanopto === true,
        includeViewerPages: cmdOpts.includeViewerPages === true,
      });
    },
  );

program
  .command("scan")
  .description("Capture the currently visible page into ./out after you navigate and confirm")
  .option("-w, --workbook <title>", "Workbook title for the report section", "Captured workbook")
  .option("-o, --out-dir <path>", "Output directory", path.join(process.cwd(), "out"))
  .option(
    "--spinner-wait-ms <n>",
    "Max wait per phase for PebblePad `.app-spinner-wrapper` to clear (twice: before and after brief in-page scroll-prep); 0 disables",
    (v) => intInRange(v, 180_000, 0, 600_000),
    180_000,
  )
  .option(
    "--settle-ms <n>",
    "After loading UI handling, wait this many ms before capturing (helps SPAs finish rendering)",
    (v) => intInRange(v, 2000, 0, 600_000),
    2000,
  )
  .option("--skip-subtitles", "Do not fetch WebVTT/SRT caption sidecar files (never downloads video)")
  .option("--skip-pdfs", "Do not fetch/extract linked PDF text")
  .option(
    "--skip-viewer-dig",
    "Do not open extra tabs for PebblePad #/viewer/... routes to harvest embedded PDF/PPTX links",
  )
  .option(
    "--content-scope <selector>",
    "CSS selector to restrict content extraction (e.g. '[data-hook=\"template-view-mode-false\"]')",
  )
  .action(
    async (cmdOpts: {
      workbook: string;
      outDir: string;
      spinnerWaitMs: number;
      settleMs: number;
      skipSubtitles?: boolean;
      skipPdfs?: boolean;
      skipViewerDig?: boolean;
      contentScope?: string;
    }) => {
      const opts = program.opts<{
        profileDir: string;
        slowMoMs: number;
        baseUrl: string;
      }>();

      await runScan({
        userDataDir: opts.profileDir,
        baseUrl: opts.baseUrl,
        slowMoMs: opts.slowMoMs,
        workbookTitle: cmdOpts.workbook,
        outDir: cmdOpts.outDir,
        spinnerWaitMs: cmdOpts.spinnerWaitMs,
        settleMs: cmdOpts.settleMs,
        capture: captureOptionsFrom(cmdOpts),
      });
    },
  );

program
  .command("walk")
  .description(
    "Slowly crawl same-origin links starting from the current page (supervised; respects delays; no submissions)",
  )
  .option("-w, --workbook <title>", "Workbook title for the report section", "Captured workbook")
  .option("-o, --out-dir <path>", "Output directory", path.join(process.cwd(), "out"))
  .option(
    "--max-pages <n>",
    "Optional hard cap on pages (default: crawl until the in-scope link queue is empty)",
    (v) => cappedPositiveInt(v, 500_000),
  )
  .option(
    "--page-delay-ms <n>",
    "Delay after each navigation before scroll prep",
    (v) => intInRange(v, 1200, 0, 600_000),
    1200,
  )
  .option(
    "--settle-ms <n>",
    "After PebblePad loading UI clears and scroll-prep, wait before link harvest + snapshot (helps SPAs finish loading)",
    (v) => intInRange(v, 2000, 0, 600_000),
    2000,
  )
  .option(
    "--spinner-wait-ms <n>",
    "Max wait per phase for PebblePad `.app-spinner-wrapper` to clear (runs twice per page: before and after scroll-prep); 0 disables",
    (v) => intInRange(v, 180_000, 0, 600_000),
    180_000,
  )
  .option(
    "--site-wide",
    "Within the same origin, follow links across the entire site (not just the current path prefix)",
  )
  .option(
    "--url-prefix <url>",
    "Only follow URLs under this prefix path (defaults to the starting page path; overridden by --site-wide)",
  )
  .option(
    "--preserve-hash",
    "Keep URL #fragments when de-duplicating/queueing (useful for some hash-router SPAs)",
  )
  .option("--no-auto-scroll", "Disable scrolling to reveal lazy-loaded links/menus before discovery")
  .option(
    "--scroll-pause-ms <n>",
    "After auto-scroll, wait this long for lazy content to mount",
    (v) => intInRange(v, 400, 0, 600_000),
    400,
  )
  .option(
    "--nav-wait <mode>",
    "Playwright navigation waitUntil: domcontentloaded | load | networkidle",
    "domcontentloaded",
  )
  .option(
    "--shared-host-suffix <suffix>",
    "Allow crawling links on other subdomains of this suffix (e.g. pebblepad.co.uk for v3 + atlas hosts)",
  )
  .option("--skip-subtitles", "Do not fetch WebVTT/SRT caption sidecar files (never downloads video)")
  .option("--skip-pdfs", "Do not fetch/extract linked PDF text")
  .option(
    "--skip-viewer-dig",
    "Do not open extra tabs for PebblePad #/viewer/... routes to harvest embedded PDF/PPTX links",
  )
  .option("--skip-panopto", "Do not fetch closed captions from linked Panopto videos")
  .option(
    "--link-scope <selector>",
    "CSS selector to restrict link discovery (PebblePad workbooks default to quick nav + .workbook-builder-wrapper)",
  )
  .option(
    "--content-scope <selector>",
    "CSS selector to restrict content extraction (e.g. '[data-hook=\"template-view-mode-false\"]')",
  )
  .option(
    "--log-queue",
    "After each captured page, print how many URLs are still waiting in the crawl queue",
  )
  .action(
    async (
      cmdOpts: {
        workbook: string;
        outDir: string;
        maxPages?: number;
        pageDelayMs: number;
        settleMs: number;
        spinnerWaitMs: number;
        siteWide?: boolean;
        urlPrefix?: string;
        preserveHash?: boolean;
        noAutoScroll?: boolean;
        scrollPauseMs: number;
        navWait: string;
        sharedHostSuffix?: string;
        skipSubtitles?: boolean;
        skipPdfs?: boolean;
        skipViewerDig?: boolean;
        skipPanopto?: boolean;
        linkScope?: string;
        contentScope?: string;
        logQueue?: boolean;
      },
    ) => {
      const opts = program.opts<{
        profileDir: string;
        slowMoMs: number;
        baseUrl: string;
      }>();

      await runWalk({
        userDataDir: opts.profileDir,
        baseUrl: opts.baseUrl,
        slowMoMs: opts.slowMoMs,
        workbookTitle: cmdOpts.workbook,
        outDir: cmdOpts.outDir,
        maxPages: cmdOpts.maxPages !== undefined ? cmdOpts.maxPages : null,
        pageDelayMs: cmdOpts.pageDelayMs,
        settleMs: cmdOpts.settleMs,
        spinnerWaitMs: cmdOpts.spinnerWaitMs,
        siteWide: cmdOpts.siteWide === true,
        urlPrefix: cmdOpts.urlPrefix ?? null,
        capture: captureOptionsFrom(cmdOpts),
        preserveHash: cmdOpts.preserveHash === true,
        autoScroll: cmdOpts.noAutoScroll !== true,
        scrollPauseMs: cmdOpts.scrollPauseMs,
        navWaitUntil: parseNavWait(cmdOpts.navWait),
        sharedHostSuffix: cmdOpts.sharedHostSuffix?.trim() ? cmdOpts.sharedHostSuffix.trim() : null,
        linkScope: cmdOpts.linkScope?.trim() ? cmdOpts.linkScope.trim() : null,
        logQueue: cmdOpts.logQueue === true,
      });
    },
  );

await program.parseAsync(process.argv);
