import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.ts";
import { MARKETPLACES, marketplaceById } from "@sellereurope/shared";
import { listOrders, confirmShipment, type SpApiClient } from "@sellereurope/sp-api";
import type { MarketplaceCode } from "@sellereurope/shared";

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

  app.get("/orders", async (req) => {
    const q = z.object({ fulfillment: z.string().optional() }).parse(req.query);
    return prisma.order.findMany({ where: { fulfillment: q.fulfillment }, orderBy: { purchaseDate: "desc" }, take: 100 });
  });

  /**
   * Depot fulfilment pipeline:
   *   NEW -> SOURCE_ORDERED (you bought it on the source marketplace, shipped to your depot)
   *       -> AT_DEPOT       (parcel arrived, repack + your own label)
   *       -> SHIPPED        (your carrier + tracking; also confirmed to Amazon)
   */
  app.post("/orders/:id/source-ordered", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ sourceOrderId: z.string().min(1), sourceCost: z.number().min(0).optional() }).parse(req.body);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return reply.code(404).send({ error: "not found" });
    return prisma.order.update({ where: { id }, data: { ...body, fulfillment: "SOURCE_ORDERED" } });
  });

  app.post("/orders/:id/received", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return reply.code(404).send({ error: "not found" });
    return prisma.order.update({ where: { id }, data: { fulfillment: "AT_DEPOT", depotReceivedAt: new Date() } });
  });

  app.post("/orders/:id/ship", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ carrier: z.string().min(1), trackingNumber: z.string().min(1), carrierName: z.string().optional() }).parse(req.body);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return reply.code(404).send({ error: "not found" });
    const mp = MARKETPLACES[order.marketplace as MarketplaceCode];
    if (!mp) return reply.code(400).send({ error: `unknown marketplace ${order.marketplace}` });
    await confirmShipment(client, { amazonOrderId: order.amazonOrderId, marketplaceId: mp.id, carrierCode: body.carrier, carrierName: body.carrierName, trackingNumber: body.trackingNumber });
    return prisma.order.update({ where: { id }, data: { fulfillment: "SHIPPED", carrier: body.carrier, trackingNumber: body.trackingNumber, shippedAt: new Date() } });
  });
}
