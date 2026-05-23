import { useEffect, useState } from "react";
import type { ScrapePageIndex } from "@/types";

type ScrapeIndexFile = {
  generatedAt: string;
  sourceFile: string;
  pageCount: number;
  pages: ScrapePageIndex[];
};

export function useScrapeIndex() {
  const [data, setData] = useState<ScrapeIndexFile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}scrape-index.json`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const findPage = (name?: string): ScrapePageIndex | null => {
    if (!name || !data) return null;
    return data.pages.find((p) => p.name === name) ?? null;
  };

  return { data, loading, findPage };
}
