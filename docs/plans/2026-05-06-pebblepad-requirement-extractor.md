# PebblePad Requirement Extractor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a supervised, human-paced browser assistant that extracts visible PebblePad requirements into a local Markdown/JSON report without submitting work or bypassing access controls.

**Architecture:** A small TypeScript CLI drives Playwright with a **persistent browser context** (user data directory) so login is the user’s normal session. Scanning collects page snapshots (visible text, links, simple form cues) and passes them through **pure, testable** heuristics to detect deadlines, word counts, uploads, and ambiguity flags. Outputs are written under `./out/` as timestamped artifacts.

**Tech Stack:** Node 20+, TypeScript, Vitest (unit tests), Playwright (Chromium persistent context), `commander` (CLI).

---

## Design (condensed)

### Threat model / ethics

- No stealth, no credential harvesting, no auto-submit.
- Only navigate and read what the logged-in user can see.
- Rate-limit via delays and sequential page opens; user confirms continuation in interactive mode.

### Modules

- `src/cli.ts` — CLI entry (`open`, `scan`, `report`).
- `src/browser/context.ts` — `launchSupervisedContext()` using `launchPersistentContext`.
- `src/extract/snapshot.ts` — `capturePageSnapshot(page)` → title, url, text, links, hints.
- `src/extract/heuristics.ts` — regex/heuristic extraction from plain text (deadlines, word counts, uploads).
- `src/report/types.ts` — `RequirementReport`, `PageFinding`, etc.
- `src/report/markdown.ts` — deterministic Markdown renderer for findings.
- `src/commands/*.ts` — orchestration per command.

### Configuration

- Env: `PEBBLEPAD_BASE_URL` (institution-specific landing URL).
- Flags: `--user-data-dir`, `--slow-mo-ms`, `--out-dir`.

### Testing strategy

- **TDD for pure functions:** `markdown.ts`, `heuristics.ts` (fast, no browser).
- Browser flows verified manually first; optional future Playwright smoke behind `RUN_BROWSER_SMOKE=1`.

---

### Task 1: Report Markdown (TDD)

**Files:**

- Create: `src/report/types.ts`
- Create: `src/report/markdown.ts`
- Create: `src/report/markdown.test.ts`

**Steps:** Red → Green → Refactor for `renderRequirementReportMarkdown(report)`.

---

### Task 2: Heuristics (TDD)

**Files:**

- Create: `src/extract/heuristics.ts`
- Create: `src/extract/heuristics.test.ts`

**Steps:** Red → Green for `analyzeVisibleText(text)` returning structured hints + `unclear` reasons.

---

### Task 3: Snapshot + CLI

**Files:**

- Create: `src/extract/snapshot.ts`
- Create: `src/browser/context.ts`
- Create: `src/commands/open.ts`
- Create: `src/commands/scan.ts`
- Create: `src/cli.ts`
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`

**Steps:** Wire `pnpm/npm run dev open` and `scan` with conservative defaults.

---

### Task 4: Verification

Run:

- `npm test`
- `npm run build`

Expected: all tests pass; `dist/cli.js` exists.
