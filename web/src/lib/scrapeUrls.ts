const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

/** Static text assets copied into web/public/scrape/ */
export function staticScrapeUrl(staticAssetsBase: string, assetDir: string, file: string) {
  return `${base}${staticAssetsBase}/${assetDir}/${file}`.replace(/\/+/g, "/");
}

/** Full HTML + large files from local out/ via Vite dev middleware */
export function devScrapeAssetUrl(sessionFolderName: string, assetDir: string, file: string) {
  return `${base}scrape-assets/${sessionFolderName}/${assetDir}/${file}`.replace(/\/+/g, "/");
}

export function pickScrapeAssetUrl(
  sessionFolderName: string,
  staticAssetsBase: string,
  assetDir: string,
  file: string,
  preferDevHtml = false,
) {
  if (preferDevHtml && import.meta.env.DEV) {
    return devScrapeAssetUrl(sessionFolderName, assetDir, file);
  }
  return staticScrapeUrl(staticAssetsBase, assetDir, file);
}
