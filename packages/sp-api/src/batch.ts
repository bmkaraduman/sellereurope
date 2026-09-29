import type { SpApiClient } from "./client.ts";
import type { OfferSummary } from "./pricing.ts";
import { AMAZON_RETAIL_SELLER_IDS } from "./pricing.ts";
import type { FeeEstimate } from "./fees.ts";

export const BATCH_SIZE = 20;

export function chunk<T>(arr: T[], size = BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface CatalogHit { asin: string; title?: string; salesRank?: number; imageUrl?: string }

/** Catalog Items searchCatalogItems by ASIN list (max 20). Returns only ASINs that exist on the marketplace. */
export async function searchCatalogByAsins(client: SpApiClient, asins: string[], marketplaceId: string): Promise<Map<string, CatalogHit>> {
  const out = new Map<string, CatalogHit>();
  for (const group of chunk(asins)) {
    const res = await client.get<any>(`/catalog/2022-04-01/items`, {
      identifiers: group,
      identifiersType: "ASIN",
      marketplaceIds: marketplaceId,
      includedData: ["summaries", "salesRanks", "images"],
      pageSize: BATCH_SIZE,
    });
    for (const item of res.items ?? []) {
      out.set(item.asin, {
        asin: item.asin,
        title: item.summaries?.[0]?.itemName,
        salesRank: item.salesRanks?.[0]?.displayGroupRanks?.[0]?.rank,
        imageUrl: item.images?.[0]?.images?.[0]?.link,
      });
    }
  }
  return out;
}

/** Product Pricing getItemOffersBatch (max 20 per call, ~0.1 req/s). */
export async function getItemOffersBatch(client: SpApiClient, asins: string[], marketplaceId: string): Promise<Map<string, OfferSummary>> {
  const out = new Map<string, OfferSummary>();
  for (const group of chunk(asins)) {
    const res = await client.post<any>(`/batches/products/pricing/v0/itemOffers`, {
      requests: group.map((asin) => ({
        uri: `/products/pricing/v0/items/${asin}/offers`,
        method: "GET",
        MarketplaceId: marketplaceId,
        ItemCondition: "New",
        CustomerType: "Consumer",
      })),
    });
    for (const r of res.responses ?? []) {
      const asin: string | undefined = r.request?.uri?.match(/items\/([A-Z0-9]{10})\//)?.[1] ?? r.body?.payload?.ASIN;
      const payload = r.body?.payload;
      if (!asin || !payload) continue;
      const offers: any[] = payload.Offers ?? [];
      const summary = payload.Summary ?? {};
      const buyBox = (summary.BuyBoxPrices ?? []).find((b: any) => b.condition?.toLowerCase() === "new");
      const lowest = (summary.LowestPrices ?? [])
        .filter((l: any) => l.condition?.toLowerCase() === "new")
        .map((l: any) => l.LandedPrice?.Amount as number)
        .filter((n: any) => typeof n === "number")
        .sort((a: number, b: number) => a - b)[0];
      out.set(asin, {
        buyBoxPrice: buyBox?.LandedPrice?.Amount,
        lowestPrice: lowest,
        offerCount: Number(summary.TotalOfferCount ?? offers.length ?? 0),
        amazonSells: offers.some((o) => AMAZON_RETAIL_SELLER_IDS.has(o.SellerId)),
        currency: buyBox?.LandedPrice?.CurrencyCode ?? summary.LowestPrices?.[0]?.LandedPrice?.CurrencyCode ?? "EUR",
      });
    }
  }
  return out;
}

/** Product Fees getMyFeesEstimates (max 20 per call). */
export async function getFeesEstimates(client: SpApiClient, items: Array<{ asin: string; price: number }>, marketplaceId: string, currency: string): Promise<Map<string, FeeEstimate>> {
  const out = new Map<string, FeeEstimate>();
  for (const group of chunk(items)) {
    const res = await client.post<any[]>(`/products/fees/v0/feesEstimate`, group.map((it) => ({
      IdType: "ASIN",
      IdValue: it.asin,
      FeesEstimateRequest: {
        MarketplaceId: marketplaceId,
        IsAmazonFulfilled: false,
        Identifier: `se-${it.asin}`,
        PriceToEstimateFees: { ListingPrice: { CurrencyCode: currency, Amount: it.price } },
      },
    })));
    for (const r of res ?? []) {
      const result = r.FeesEstimateResult ?? r;
      const asin = result.FeesEstimateIdentifier?.IdValue;
      if (!asin || result.Status !== "Success") continue;
      let referral = 0, other = 0;
      for (const d of result.FeesEstimate?.FeeDetailList ?? []) {
        const amt = d.FinalFee?.Amount ?? 0;
        if (d.FeeType === "ReferralFee") referral += amt; else other += amt;
      }
      out.set(asin, { referralFee: referral, otherFees: other, total: referral + other, currency });
    }
  }
  return out;
}
