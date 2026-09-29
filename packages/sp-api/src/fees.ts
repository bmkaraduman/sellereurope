import type { SpApiClient } from "./client.ts";

export interface FeeEstimate {
  referralFee: number;
  otherFees: number;
  total: number;
  currency: string;
}

/** Product Fees API v0 - getMyFeesEstimateForASIN (FBM = IsAmazonFulfilled false) */
export async function getFeesEstimate(client: SpApiClient, asin: string, marketplaceId: string, price: number, currency: string): Promise<FeeEstimate | null> {
  const res = await client.post<any>(`/products/fees/v0/items/${asin}/feesEstimate`, {
    FeesEstimateRequest: {
      MarketplaceId: marketplaceId,
      IsAmazonFulfilled: false,
      Identifier: `se-${asin}-${Date.now()}`,
      PriceToEstimateFees: { ListingPrice: { CurrencyCode: currency, Amount: price } },
    },
  });
  const result = res.payload?.FeesEstimateResult;
  if (!result || result.Status !== "Success") return null;
  const est = result.FeesEstimate;
  let referral = 0, other = 0;
  for (const d of est.FeeDetailList ?? []) {
    const amt = d.FinalFee?.Amount ?? 0;
    if (d.FeeType === "ReferralFee") referral += amt; else other += amt;
  }
  return { referralFee: referral, otherFees: other, total: est.TotalFeesEstimate?.Amount ?? referral + other, currency: est.TotalFeesEstimate?.CurrencyCode ?? currency };
}
