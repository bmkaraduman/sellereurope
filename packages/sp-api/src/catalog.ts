import type { SpApiClient } from "./client.ts";

export interface CatalogItem {
  asin: string;
  summaries?: Array<{ marketplaceId: string; itemName?: string; brand?: string; browseClassification?: { displayName: string } }>;
  salesRanks?: Array<{ marketplaceId: string; displayGroupRanks?: Array<{ rank: number; title: string }> }>;
  images?: Array<{ marketplaceId: string; images: Array<{ link: string; height: number; width: number }> }>;
  dimensions?: Array<{ marketplaceId: string; package?: { weight?: { value: number; unit: string } } }>;
}

/** Catalog Items API v2022-04-01 */
export async function getCatalogItem(client: SpApiClient, asin: string, marketplaceId: string): Promise<CatalogItem | null> {
  try {
    return await client.get<CatalogItem>(`/catalog/2022-04-01/items/${asin}`, {
      marketplaceIds: marketplaceId,
      includedData: ["summaries", "salesRanks", "images", "dimensions"],
    });
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}
