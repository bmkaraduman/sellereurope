import type { SpApiClient } from "./client.ts";

export interface Order {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderStatus: string;
  OrderTotal?: { CurrencyCode: string; Amount: string };
  MarketplaceId: string;
  ShippingAddress?: Record<string, string>;
}

/** Orders API v0 - list orders created after a date for given marketplaces. */
export async function listOrders(client: SpApiClient, marketplaceIds: string[], createdAfter: Date): Promise<Order[]> {
  const orders: Order[] = [];
  let nextToken: string | undefined;
  do {
    const res = await client.get<any>(`/orders/v0/orders`, nextToken
      ? { NextToken: nextToken }
      : { MarketplaceIds: marketplaceIds, CreatedAfter: createdAfter.toISOString(), OrderStatuses: ["Unshipped", "PartiallyShipped", "Shipped"] });
    orders.push(...(res.payload?.Orders ?? []));
    nextToken = res.payload?.NextToken;
  } while (nextToken);
  return orders;
}

export async function getOrderItems(client: SpApiClient, amazonOrderId: string) {
  const res = await client.get<any>(`/orders/v0/orders/${amazonOrderId}/orderItems`);
  return res.payload?.OrderItems ?? [];
}

export interface ConfirmShipmentInput {
  amazonOrderId: string;
  marketplaceId: string;
  /** Carrier code as Amazon knows it, e.g. "DHL", "DPD", "GLS", "Hermes", "UPS", "PostNL", "Poste Italiane", "Other". */
  carrierCode: string;
  carrierName?: string;
  trackingNumber: string;
  shipDate?: Date;
  /** Order item ids with quantities; if omitted, all items are fetched and confirmed. */
  items?: Array<{ orderItemId: string; quantity: number }>;
}

/**
 * Orders API v0 - confirmShipment. Marks the order shipped with YOUR label
 * (carrier + tracking) so Amazon can notify the buyer and start the payout.
 */
export async function confirmShipment(client: SpApiClient, input: ConfirmShipmentInput): Promise<void> {
  const items = input.items ?? (await getOrderItems(client, input.amazonOrderId)).map((i: any) => ({
    orderItemId: i.OrderItemId as string,
    quantity: Number(i.QuantityOrdered),
  }));
  await client.post<void>(`/orders/v0/orders/${input.amazonOrderId}/shipmentConfirmation`, {
    marketplaceId: input.marketplaceId,
    packageDetail: {
      packageReferenceId: "1",
      carrierCode: input.carrierCode,
      carrierName: input.carrierName,
      trackingNumber: input.trackingNumber,
      shipDate: (input.shipDate ?? new Date()).toISOString(),
      orderItems: items,
    },
  });
}
