import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.ts";
import { runScan } from "../services/scanner.ts";
import { MARKETPLACES } from "@sellereurope/shared";
import type { SpApiClient } from "@sellereurope/sp-api";

const scanItem = z.object({
  asin: z.string().regex(/^[A-Z0-9]{10}$/),
  title: z.string().default(""),
  price: z.number().positive().optional(),
  currency: z.string(),
  isPrime: z.boolean().default(false),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  imageUrl: z.string().optional(),
  url: z.string(),
});

export async function scanRoutes(app: FastifyInstance, client: SpApiClient) {
  /** POST /scans { storeId, sourceMarketplace, sourceLabel, items[] } -> { scanId } ; runs in background */
  app.post("/scans", async (req, reply) => {
    const body = z.object({
      storeId: z.string(),
      sourceMarketplace: z.enum(Object.keys(MARKETPLACES) as [string, ...string[]]),
      sourceLabel: z.string().default(""),
      items: z.array(scanItem).min(1).max(2000),
    }).parse(req.body);
    const store = await prisma.store.findUnique({ where: { id: body.storeId } });
    if (!store) return reply.code(404).send({ error: "store not found" });

    const scan = await prisma.scan.create({
      data: { storeId: store.id, sourceMarketplace: body.sourceMarketplace, sourceLabel: body.sourceLabel, total: body.items.length },
    });
    void runScan(client, scan.id, body.items).catch((e) => app.log.error(e));
    return reply.code(202).send({ scanId: scan.id, total: body.items.length });
  });

  app.get("/scans", async () => prisma.scan.findMany({ include: { store: { select: { name: true, targetMarketplace: true } } }, orderBy: { createdAt: "desc" }, take: 50 }));

  app.get("/scans/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: { store: true, analyses: { include: { sourceProduct: true, listing: true }, orderBy: { profit: "desc" } } },
    });
    if (!scan) return reply.code(404).send({ error: "not found" });
    return scan;
  });
}
