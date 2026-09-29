import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.ts";
import { MARKETPLACES, type MarketplaceCode } from "@sellereurope/shared";
import { putOffer, deleteOffer, patchPriceAndQuantity, type SpApiClient } from "@sellereurope/sp-api";

async function listFromAnalysis(client: SpApiClient, analysisId: string, priceOverride?: number, quantity = 1) {
    const analysis = await prisma.analysis.findUnique({ where: { id: analysisId }, include: { store: true, sourceProduct: true } });
    if (!analysis) throw Object.assign(new Error("analysis not found"), { status: 404 });
    if (analysis.decision === "SKIP") throw Object.assign(new Error("analysis decided SKIP"), { status: 400 });
    const price = priceOverride ?? analysis.salePrice;
    if (!price) throw Object.assign(new Error("no price available"), { status: 400 });

    const mp = MARKETPLACES[analysis.store.targetMarketplace as MarketplaceCode];
    const sku = `SE-${analysis.sourceProduct.sourceMarketplace}-${analysis.sourceProduct.asin}`;

    const listing = await prisma.listing.upsert({
      where: { sku },
      create: { storeId: analysis.storeId, analysisId: analysis.id, sku, asin: analysis.sourceProduct.asin, price, quantity },
      update: { price, quantity, status: "PENDING" },
    });

    try {
      const res = await putOffer(client, { sku, asin: listing.asin, marketplaceId: mp.id, price, currency: mp.currency, quantity, handlingDays: analysis.store.handlingDays });
      const ok = res?.status === "ACCEPTED";
      return prisma.listing.update({ where: { id: listing.id }, data: { status: ok ? "ACTIVE" : "ERROR", spApiResponse: res } });
    } catch (e: any) {
      return prisma.listing.update({ where: { id: listing.id }, data: { status: "ERROR", spApiResponse: { error: String(e?.message ?? e) } } });
    }
}

export async function listingRoutes(app: FastifyInstance, client: SpApiClient) {
  /** POST /listings { analysisId, price? } -> push offer to Amazon */
  app.post("/listings", async (req, reply) => {
    const body = z.object({ analysisId: z.string(), price: z.number().positive().optional(), quantity: z.number().int().positive().default(1) }).parse(req.body);
    try {
      return await listFromAnalysis(client, body.analysisId, body.price, body.quantity);
    } catch (e: any) {
      return reply.code(e.status ?? 500).send({ error: e.message });
    }
  });

  /** POST /listings/bulk { analysisIds[] } -> list many; returns per-item outcome */
  app.post("/listings/bulk", async (req) => {
    const body = z.object({ analysisIds: z.array(z.string()).min(1).max(200), quantity: z.number().int().positive().default(1) }).parse(req.body);
    const results: Array<{ analysisId: string; ok: boolean; status?: string; sku?: string; error?: string }> = [];
    for (const id of body.analysisIds) {
      try {
        const l = await listFromAnalysis(client, id, undefined, body.quantity);
        results.push({ analysisId: id, ok: l.status === "ACTIVE", status: l.status, sku: l.sku });
      } catch (e: any) {
        results.push({ analysisId: id, ok: false, error: e.message });
      }
    }
    return { results, listed: results.filter((r) => r.ok).length };
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
