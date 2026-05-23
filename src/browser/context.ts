import { chromium, type BrowserContext } from "playwright";
import path from "node:path";

export type SupervisedContextOptions = {
  userDataDir: string;
  slowMoMs: number;
};

export function defaultUserDataDir(): string {
  return path.resolve(process.cwd(), ".playwright-profile");
}

export async function launchSupervisedContext(
  options: SupervisedContextOptions,
): Promise<BrowserContext> {
  const channel = process.env.PLAYWRIGHT_CHANNEL;

  return chromium.launchPersistentContext(options.userDataDir, {
    headless: false,
    ...(channel ? { channel } : {}),
    slowMo: options.slowMoMs,
  });
}
