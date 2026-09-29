import type { SpApiClient } from "./client.ts";

/**
 * Seller ids used by Amazon's own retail arm on EU marketplaces. Extend as needed;
 * an offer from one of these ids means "Amazon sells this item itself".
 */
export const AMAZON_RETAIL_SELLER_IDS = new Set<string>([
  "A3JWKAKR8XB7XF", // Amazon EU S.a.r.L. (DE)
  "A11IL2PNWYJU7H", // Amazon EU S.a.r.L. (IT/FR/ES variants)
  "A1AT7YVPFBWXBL", // Amazon EU S.a.r.L. (ES)
  "A2HOZY7FQL3HGE", // Amazon EU S.a.r.L. (NL)
  "A3P5ROKL5A1OLE", // Amazon EU S.a.r.L. (UK)
]);

export interface OfferSummary {
  buyBoxPrice?: number;
  lowestPrice?: number;
  offerCount: number;
  amazonSells: boolean;
  currency: string;
}

/**
 * Product Pricing API v0 - getItemOffers. Returns landed prices (price + shipping).
 * Note: rate limit is ~0.5 req/s; batch endpoints exist for higher throughput.
 */
export async function getItemOffers(client: SpApiClient, asin: string, marketplaceId: string): Promise<OfferSummary> {
  const res = await client.get<any>(`/products/pricing/v0/items/${asin}/offers`, {
    MarketplaceId: marketplaceId,
    ItemCondition: "New",
    CustomerType: "Consumer",
  });
  const payload = res.payload ?? {};
  const offers: any[] = payload.Offers ?? [];
  const summary = payload.Summary ?? {};

  const buyBox = (summary.BuyBoxPrices ?? []).find((b: any) => b.condition?.toLowerCase() === "new");
  const lowest = (summary.LowestPrices ?? [])
    .filter((l: any) => l.condition?.toLowerCase() === "new")
    .map((l: any) => l.LandedPrice?.Amount as number)
    .filter((n: any) => typeof n === "number")
    .sort((a: number, b: number) => a - b)[0];

  const currency = buyBox?.LandedPrice?.CurrencyCode ?? summary.LowestPrices?.[0]?.LandedPrice?.CurrencyCode ?? "EUR";
  const amazonSells = offers.some((o) => AMAZON_RETAIL_SELLER_IDS.has(o.SellerId));

  return {
    buyBoxPrice: buyBox?.LandedPrice?.Amount,
    lowestPrice: lowest,
    offerCount: Number(summary.TotalOfferCount ?? offers.length ?? 0),
    amazonSells,
    currency,
  };
}
