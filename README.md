# IPGCE Tracker

A Linear-style completion tracker for the UWE iPGCE module, combining curated assessment requirements with scraped PebblePad workbook content.

**Live site:** enable GitHub Pages (Settings → Pages → GitHub Actions) after pushing to `main`. The app is served at `https://<username>.github.io/pppad/`.

## What's included

- **Curated requirements** — School permission, Assessment A/B, teaching log, Panopto, AI policy, and formative items with checklists, deadlines, and contacts.
- **Scraped cross-reference** — Each task links to matching PebblePad page excerpts from `out/pebblepad-walk-*.json`.
- **Progress tracking** — Task status, per-item checklists, and notes stored in your browser (`localStorage`).
- **Linear-inspired UI** — Dark theme, shadcn-style components, compact sidebar navigation.

## PebblePad scraper (CLI)

### Save full HTML for every workbook page

Use **`capture-dom`** (not `walk`) to crawl the same links as `walk` and save **`page.content()`** HTML per page plus a manifest:

```bash
npm install
npm run build

# Recommended for PebblePad workbooks (hash routes + v3/atlas subdomains):
npm run scrape:html
```

Or explicitly:

```bash
npm run dev -- capture-dom \
  --preserve-hash \
  --shared-host-suffix pebblepad.co.uk \
  --log-queue \
  -o ./out
```

**Workflow:**

1. A Chromium window opens with your saved profile (`~/.pebblepad-req-profile` by default).
2. Log in and navigate to your workbook **starting page**.
3. Return to the terminal and press **Enter** once.
4. The tool follows in-scope links and writes **rich captures** per page:

```
out/pebblepad-dom-<timestamp>/
  manifest.json
  pages/
    p001-<pageId>/
      page.html           # full DOM (may show empty student form UI)
      content.txt         # readable text: workbook + linked PDF/DOCX extracts
      snapshot.json       # links, heuristics, extraction metadata
      summary.json
      linked-docs/        # downloaded briefs as .txt (when found on the page)
```

**Important:** PebblePad often shows `This form is yet to be completed` in HTML for unfilled student forms. The real brief is usually in **linked Word/PDF files** — those are downloaded into `linked-docs/` and merged into `content.txt`. Viewer (`#/viewer/...`) routes are **not** crawled as separate pages; documents are harvested from workbook pages instead.

Check `manifest.json` → `captureQuality` per page: `rich`, `placeholder-only`, etc.

Single page only: `npm run dev -- capture-dom --single`

Text/requirements report (no HTML): `npm run dev -- walk --help`

After a new **walk** or **capture-dom** session, refresh the web scrape index:

```bash
npm run build:scrape   # from repo root — walk index + unified DOM text assets
# or: cd web && npm run build:scrape
```

This writes `web/public/unified-scrape.json` and copies **text only** (`content.txt`, `linked-docs/`) into `web/public/scrape/<session>/` for GitHub Pages. Full HTML (~100MB+) stays in `out/` and is **not** deployed.

### Multi-modal sources in the tracker

On each task, open the **Sources** tab (or pick a page in the **Scrape library** under the sidebar):

| Tab | What it shows |
|-----|----------------|
| **Readable** | Raw `content.txt` — workbook text plus linked brief extracts |
| **Page** | Reconstructed view in the tracker’s dark theme (workbook + linked docs) |
| **Linked docs** | Individual files from `linked-docs/` |
| **Walk** | Heuristic excerpt from the older `walk` JSON scrape |

## Web app development

```bash
cd web
npm install
npm run dev
```

For local dev with root path `/` instead of `/pppad/`:

```bash
VITE_BASE_PATH=/ npm run dev
```

Production build (uses `/pppad/` base by default):

```bash
cd web && npm run build
```

## GitHub Pages

1. Create a GitHub repo and push this project to `main`.
2. **Settings → Pages → Build and deployment → Source:** GitHub Actions.
3. Push to `main`; the workflow in `.github/workflows/deploy-pages.yml` builds `web/` and deploys.

If your repository name is not `pppad`, set `VITE_BASE_PATH` in `.github/workflows/deploy-pages.yml` to match `/<repo-name>/`.

The built scrape text assets under `web/public/scrape/` and `web/public/unified-scrape.json` are included in the deploy (run `npm run build:scrape` before committing if you refresh captures).

## Cloud progress (GitHub — no Supabase/Firebase)

GitHub Pages cannot run a database server. Progress sync uses a **private GitHub Gist** in your own account (via OAuth). You only need a GitHub OAuth App — no Supabase, Firebase, or files on your computer.

### One-time setup

1. **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
   - Application name: `IPGCE Tracker` (anything)
   - Homepage URL: `https://YOUR_USER.github.io/pppad/`
   - Authorization callback URL: same as homepage (must match exactly)
2. Copy the **Client ID** (not the client secret — the SPA uses PKCE).
3. Repo **Settings → Secrets → Actions** → `VITE_GITHUB_CLIENT_ID` = that client ID.
4. Local dev: `web/.env.local` with `VITE_GITHUB_CLIENT_ID=...`

On the live site, click **Save to GitHub**, authorize **gist** scope, and progress is stored in a private gist named `ipgce-tracker-progress-v1`. You can open it from the **Gist** link in the header.

## Data privacy

- **Without sign-in:** progress stays in the browser (`localStorage`) on that device only.
- **With sign-in:** progress lives in a **private gist** under your GitHub user. Scrape content in `web/public/` is public static data — no PebblePad login is stored.
