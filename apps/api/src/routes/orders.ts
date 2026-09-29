import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.ts";
import { MARKETPLACES, marketplaceById } from "@sellereurope/shared";
import { listOrders, type SpApiClient } from "@sellereurope/sp-api";

export async function orderRoutes(app: FastifyInstance, client: SpApiClient) {
  /** POST /orders/sync { marketplaces?: ["DE"], days?: 7 } */
  app.post("/orders/sync", async (req) => {
    const body = z.object({ marketplaces: z.array(z.string()).optional(), days: z.number().default(7) }).parse(req.body ?? {});
    const ids = (body.marketplaces ?? Object.keys(MARKETPLACES)).map((c) => MARKETPLACES[c as keyof typeof MARKETPLACES].id);
    const since = new Date(Date.now() - body.days * 86_400_000);
    const orders = await listOrders(client, ids, since);
    for (const o of orders) {
      await prisma.order.upsert({
        where: { amazonOrderId: o.AmazonOrderId },
        create: {
          amazonOrderId: o.AmazonOrderId,
          marketplace: marketplaceById(o.MarketplaceId)?.code ?? o.MarketplaceId,
          status: o.OrderStatus,
          total: o.OrderTotal ? Number(o.OrderTotal.Amount) : null,
          currency: o.OrderTotal?.CurrencyCode,
          purchaseDate: new Date(o.PurchaseDate),
          raw: o as any,
        },
        update: { status: o.OrderStatus, raw: o as any },
      });
    }
    return { synced: orders.length };
  });

  app.get("/orders", async () => prisma.order.findMany({ orderBy: { purchaseDate: "desc" }, take: 100 }));
}
