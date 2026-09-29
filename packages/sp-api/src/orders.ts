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
