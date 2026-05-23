import { launchSupervisedContext } from "../browser/context.js";
import { pauseForCrawlCapture } from "../browser/crawlDiscovery.js";
import { analyzeVisibleText } from "../extract/heuristics.js";
import { mergeTextForAnalysis } from "../extract/mergeText.js";
import {
  capturePageSnapshot,
  type CapturePageOptions,
  defaultCapturePageOptions,
} from "../extract/snapshot.js";
import { isPlaywrightTargetClosedError } from "../lib/playwrightClosed.js";
import { waitForEnter } from "../lib/waitForEnter.js";
import { writeRequirementReportArtifacts } from "../lib/writeArtifacts.js";
import { buildWorkbookReport } from "../report/buildFromSnapshot.js";

export async function runScan(args: {
  userDataDir: string;
  baseUrl: string;
  slowMoMs: number;
  workbookTitle: string;
  outDir: string;
  spinnerWaitMs: number;
  settleMs: number;
  capture: Partial<CapturePageOptions>;
}): Promise<void> {
  const context = await launchSupervisedContext({
    userDataDir: args.userDataDir,
    slowMoMs: args.slowMoMs,
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(args.baseUrl, { waitUntil: "domcontentloaded" });

    console.log(
      [
        "Browser opened using your saved profile (if you already logged in during `open`, you should stay signed in).",
        "Navigate to the workbook/page you want summarized.",
        "",
        "After you press Enter, this tool waits for PebblePad's full-page loading overlay (`.app-spinner-wrapper`) to clear,",
        "runs a short scroll pass to surface lazy content, waits for the overlay again, then applies your settle delay before capture.",
        "",
        "When the correct page is visible, return here and press Enter to capture it.",
      ].join("\n"),
    );

    await waitForEnter("\nPress Enter to capture the current page… ");

    try {
      await pauseForCrawlCapture(page, {
        spinnerWaitMs: args.spinnerWaitMs,
        autoScroll: true,
        scrollPauseMs: 400,
        settleMs: args.settleMs,
      });

      const captureOpts: CapturePageOptions = { ...defaultCapturePageOptions, ...args.capture };
      const snapshot = await capturePageSnapshot(page, captureOpts);
      const merged = mergeTextForAnalysis(snapshot);
      const analysis = analyzeVisibleText(merged);
      const report = buildWorkbookReport({
        workbookTitle: args.workbookTitle,
        pages: [{ snapshot, analysis }],
      });

      const stamp = report.generatedAtIso.replaceAll(":", "").replaceAll(".", "");
      const baseName = `pebblepad-scan-${stamp}`;

      const { mdPath, jsonPath } = await writeRequirementReportArtifacts({
        report,
        jsonPayload: { report, pages: [{ snapshot, analysis }] },
        outDir: args.outDir,
        baseName,
      });

      console.log(`Wrote:\n- ${mdPath}\n- ${jsonPath}`);
    } catch (err: unknown) {
      if (isPlaywrightTargetClosedError(err)) {
        console.error(
          "\n[scan] The supervised browser was closed (or crashed) before capture finished — no report was written.\n",
        );
        return;
      }
      throw err;
    }
  } finally {
    await context.close();
  }
}
