import fs from "node:fs/promises";
import path from "node:path";

import type { RequirementReport } from "../report/types.js";
import { renderRequirementReportMarkdown } from "../report/markdown.js";

export async function writeRequirementReportArtifacts(args: {
  report: RequirementReport;
  jsonPayload: unknown;
  outDir: string;
  baseName: string;
}): Promise<{ mdPath: string; jsonPath: string }> {
  await fs.mkdir(args.outDir, { recursive: true });

  const mdPath = path.join(args.outDir, `${args.baseName}.md`);
  const jsonPath = path.join(args.outDir, `${args.baseName}.json`);

  await fs.writeFile(mdPath, renderRequirementReportMarkdown(args.report), "utf8");
  await fs.writeFile(jsonPath, `${JSON.stringify(args.jsonPayload, null, 2)}\n`, "utf8");

  return { mdPath, jsonPath };
}
