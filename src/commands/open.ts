import { launchSupervisedContext } from "../browser/context.js";
import { waitForEnter } from "../lib/waitForEnter.js";

export async function runOpen(args: {
  userDataDir: string;
  baseUrl: string;
  slowMoMs: number;
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
        "Browser opened using a persistent profile folder (cookies are saved locally).",
        "Log in to PebblePad in the normal way.",
        "",
        "When you are done with this session, return here and press Enter to close the browser.",
      ].join("\n"),
    );

    await waitForEnter("\nPress Enter to close the supervised browser session… ");
  } finally {
    await context.close();
  }
}
