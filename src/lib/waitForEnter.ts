import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/**
 * Wait for the user to press Enter. Requires an interactive TTY on stdin so prompts
 * cannot be skipped accidentally (e.g. some IDE task runners without a TTY).
 *
 * Set `PEBBLEPAD_ALLOW_NON_TTY=1` to skip the wait when stdin is not a TTY (automation only).
 */
export async function waitForEnter(prompt: string): Promise<void> {
  if (!input.isTTY) {
    if (process.env.PEBBLEPAD_ALLOW_NON_TTY === "1") {
      return;
    }
    throw new Error(
      [
        "stdin is not a TTY, so this tool cannot wait for you to press Enter.",
        "Run it from an interactive terminal (Terminal.app, iTerm, or the VS Code / Cursor integrated terminal),",
        "not from a pipe or a task runner that does not attach a real TTY.",
        "If you really need non-interactive mode, set PEBBLEPAD_ALLOW_NON_TTY=1 (not recommended).",
      ].join(" "),
    );
  }

  const rl = readline.createInterface({ input, output });
  try {
    await rl.question(prompt);
  } finally {
    rl.close();
  }
}
