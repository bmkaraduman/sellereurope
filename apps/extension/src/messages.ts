import type { AnalysisResult, ScrapedProduct } from "@sellereurope/shared";

export type Msg =
  | { type: "SCRAPE" }
  | { type: "ANALYZE"; product: ScrapedProduct; storeId: string }
  | { type: "LIST"; analysisId: string };

export interface Settings {
  apiUrl: string;
  apiToken: string;
  storeId: string;
}

export const DEFAULT_SETTINGS: Settings = { apiUrl: "http://localhost:4000", apiToken: "", storeId: "" };

export async function getSettings(): Promise<Settings> {
  const s = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return s as Settings;
}

export type AnalyzeResponse = AnalysisResult & { analysisId: string };
