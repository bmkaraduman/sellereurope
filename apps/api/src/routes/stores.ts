import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.ts";
import { MARKETPLACES } from "@sellereurope/shared";

const storeSchema = z.object({
  name: z.string().min(1),
  targetMarketplace: z.enum(Object.keys(MARKETPLACES) as [string, ...string[]]),
  minProfit: z.number().optional(),
  minMarginPercent: z.number().optional(),
  maxSourcePrice: z.number().nullable().optional(),
  requireSourcePrime: z.boolean().optional(),
  skipIfAmazonSells: z.boolean().optional(),
  skipIfRestricted: z.boolean().optional(),
  priceFactor: z.number().optional(),
  overhead: z.number().optional(),
  outboundShipping: z.number().min(0).optional(),
  depotCountry: z.string().length(2).optional(),
  vatRegistered: z.boolean().optional(),
  handlingDays: z.number().int().optional(),
});

export async function storeRoutes(app: FastifyInstance) {
  app.get("/stores", async () => prisma.store.findMany({ orderBy: { createdAt: "asc" } }));
  app.post("/stores", async (req) => prisma.store.create({ data: storeSchema.parse(req.body) }));
  app.patch("/stores/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return prisma.store.update({ where: { id }, data: storeSchema.partial().parse(req.body) });
  });
  app.get("/marketplaces", async () => Object.values(MARKETPLACES));
}
