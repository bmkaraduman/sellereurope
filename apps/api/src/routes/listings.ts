import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.ts";
import { MARKETPLACES, type MarketplaceCode } from "@sellereurope/shared";
import { putOffer, deleteOffer, patchPriceAndQuantity, type SpApiClient } from "@sellereurope/sp-api";

export async function listingRoutes(app: FastifyInstance, client: SpApiClient) {
  /** POST /listings { analysisId, price? } -> push offer to Amazon */
  app.post("/listings", async (req, reply) => {
    const body = z.object({ analysisId: z.string(), price: z.number().positive().optional(), quantity: z.number().int().positive().default(1) }).parse(req.body);
    const analysis = await prisma.analysis.findUnique({ where: { id: body.analysisId }, include: { store: true, sourceProduct: true } });
    if (!analysis) return reply.code(404).send({ error: "analysis not found" });
    if (analysis.decision === "SKIP") return reply.code(400).send({ error: "analysis decided SKIP" });

    const price = body.price ?? analysis.salePrice;
    if (!price) return reply.code(400).send({ error: "no price available" });

    const mp = MARKETPLACES[analysis.store.targetMarketplace as MarketplaceCode];
    const sku = `SE-${analysis.sourceProduct.sourceMarketplace}-${analysis.sourceProduct.asin}`;

    const listing = await prisma.listing.upsert({
      where: { sku },
      create: { storeId: analysis.storeId, analysisId: analysis.id, sku, asin: analysis.sourceProduct.asin, price, quantity: body.quantity },
      update: { price, quantity: body.quantity, status: "PENDING" },
    });

    try {
      const res = await putOffer(client, { sku, asin: listing.asin, marketplaceId: mp.id, price, currency: mp.currency, quantity: body.quantity, handlingDays: analysis.store.handlingDays });
      const ok = res?.status === "ACCEPTED";
      return prisma.listing.update({ where: { id: listing.id }, data: { status: ok ? "ACTIVE" : "ERROR", spApiResponse: res } });
    } catch (e: any) {
      return prisma.listing.update({ where: { id: listing.id }, data: { status: "ERROR", spApiResponse: { error: String(e?.message ?? e) } } });
    }
  });

  app.get("/listings", async (req) => {
    const q = z.object({ storeId: z.string().optional() }).parse(req.query);
    return prisma.listing.findMany({ where: { storeId: q.storeId }, include: { analysis: { include: { sourceProduct: true } } }, orderBy: { createdAt: "desc" } });
  });

  app.patch("/listings/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ price: z.number().positive(), quantity: z.number().int().min(0) }).parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id }, include: { store: true } });
    if (!listing) return reply.code(404).send({ error: "not found" });
    const mp = MARKETPLACES[listing.store.targetMarketplace as MarketplaceCode];
    const res = await patchPriceAndQuantity(client, listing.sku, mp.id, body.price, mp.currency, body.quantity);
    return prisma.listing.update({ where: { id }, data: { price: body.price, quantity: body.quantity, spApiResponse: res } });
  });

  app.delete("/listings/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const listing = await prisma.listing.findUnique({ where: { id }, include: { store: true } });
    if (!listing) return reply.code(404).send({ error: "not found" });
    const mp = MARKETPLACES[listing.store.targetMarketplace as MarketplaceCode];
    await deleteOffer(client, listing.sku, mp.id);
    return prisma.listing.update({ where: { id }, data: { status: "DELETED", quantity: 0 } });
  });
}
