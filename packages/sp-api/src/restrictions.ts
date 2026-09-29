import type { SpApiClient } from "./client.ts";

/** Listings Restrictions API v2021-08-01 - returns human readable reasons, [] if you may list. */
export async function getListingRestrictions(client: SpApiClient, asin: string, marketplaceId: string): Promise<string[]> {
  const res = await client.get<any>(`/listings/2021-08-01/restrictions`, {
    asin,
    sellerId: client.sellerId,
    marketplaceIds: marketplaceId,
    conditionType: "new_new",
  });
  const out: string[] = [];
  for (const r of res.restrictions ?? []) {
    for (const reason of r.reasons ?? []) out.push(reason.message ?? reason.reasonCode ?? "restricted");
  }
  return out;
}
