import { useEffect, useState } from "react";
import type { UnifiedScrapeIndex, UnifiedScrapePage } from "@/types";

function normalizePageName(name: string) {
  return name
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useUnifiedScrape() {
  const [data, setData] = useState<UnifiedScrapeIndex | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}unified-scrape.json`;
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const findPage = (pebblePageName?: string): UnifiedScrapePage | null => {
    if (!pebblePageName || !data) return null;
    if (data.pagesByName[pebblePageName]) return data.pagesByName[pebblePageName];

    const norm = normalizePageName(pebblePageName);
    for (const page of Object.values(data.pagesByName)) {
      if (page.pageNameNorm === norm) return page;
    }
    return null;
  };

  return { data, loading, findPage };
}
