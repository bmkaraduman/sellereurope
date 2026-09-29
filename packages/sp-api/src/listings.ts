import type { SpApiClient } from "./client.ts";

export interface CreateOfferInput {
  sku: string;
  asin: string;
  marketplaceId: string;
  price: number;
  currency: string;
  quantity: number;
  /** Handling time in days (must match what you can actually ship). */
  handlingDays?: number;
  conditionType?: "new_new";
}

/**
 * Listings Items API v2021-08-01 - creates/updates an FBM offer on an existing ASIN.
 * The productType is looked up via the Product Type Definitions API; "PRODUCT"
 * works as a generic fallback for offer-only listings on most marketplaces.
 */
export async function putOffer(client: SpApiClient, input: CreateOfferInput, productType = "PRODUCT") {
  const body = {
    productType,
    requirements: "LISTING_OFFER_ONLY",
    attributes: {
      merchant_suggested_asin: [{ value: input.asin, marketplace_id: input.marketplaceId }],
      condition_type: [{ value: input.conditionType ?? "new_new", marketplace_id: input.marketplaceId }],
      purchasable_offer: [{
        marketplace_id: input.marketplaceId,
        currency: input.currency,
        our_price: [{ schedule: [{ value_with_tax: input.price }] }],
      }],
      fulfillment_availability: [{
        fulfillment_channel_code: "DEFAULT",
        quantity: input.quantity,
        lead_time_to_ship_max_days: input.handlingDays ?? 3,
      }],
    },
  };
  return client.put<any>(`/listings/2021-08-01/items/${client.sellerId}/${encodeURIComponent(input.sku)}`, body, { marketplaceIds: input.marketplaceId });
}

export async function patchPriceAndQuantity(client: SpApiClient, sku: string, marketplaceId: string, price: number, currency: string, quantity: number) {
  const body = {
    productType: "PRODUCT",
    patches: [
      { op: "replace", path: "/attributes/purchasable_offer", value: [{ marketplace_id: marketplaceId, currency, our_price: [{ schedule: [{ value_with_tax: price }] }] }] },
      { op: "replace", path: "/attributes/fulfillment_availability", value: [{ fulfillment_channel_code: "DEFAULT", quantity }] },
    ],
  };
  return client.patch<any>(`/listings/2021-08-01/items/${client.sellerId}/${encodeURIComponent(sku)}`, body, { marketplaceIds: marketplaceId });
}

export async function deleteOffer(client: SpApiClient, sku: string, marketplaceId: string) {
  return client.delete<any>(`/listings/2021-08-01/items/${client.sellerId}/${encodeURIComponent(sku)}`, { marketplaceIds: marketplaceId });
}
