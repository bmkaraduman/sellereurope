import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.ts";
import { analyzeProduct, rulesFromStore } from "../services/analyzer.ts";
import type { MarketplaceCode } from "@sellereurope/shared";
import type { SpApiClient } from "@sellereurope/sp-api";

const scrapedSchema = z.object({
  asin: z.string().regex(/^[A-Z0-9]{10}$/),
  sourceMarketplace: z.string(),
  title: z.string(),
  price: z.number().positive(),
  currency: z.string(),
  shipping: z.number().min(0).default(0),
  inStock: z.boolean(),
  isPrime: z.boolean(),
  soldBy: z.string().default(""),
  imageUrl: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  url: z.string().url(),
  scrapedAt: z.string(),
});

export async function analyzeRoutes(app: FastifyInstance, client: SpApiClient) {
  /** POST /analyze { storeId, product } -> AnalysisResult (persisted) */
  app.post("/analyze", async (req, reply) => {
    const body = z.object({ storeId: z.string(), product: scrapedSchema, autoList: z.boolean().default(false) }).parse(req.body);
    const store = await prisma.store.findUnique({ where: { id: body.storeId } });
    if (!store) return reply.code(404).send({ error: "store not found" });

    const product = { ...body.product, sourceMarketplace: body.product.sourceMarketplace as MarketplaceCode };
    const result = await analyzeProduct(client, product, store.targetMarketplace as MarketplaceCode, rulesFromStore(store));

    const sourceProduct = await prisma.sourceProduct.create({ data: { ...product, scrapedAt: new Date(product.scrapedAt), category: undefined } as any });
    const analysis = await prisma.analysis.create({
      data: {
        storeId: store.id,
        sourceProductId: sourceProduct.id,
        decision: result.decision,
        reasons: result.reasons,
        salePrice: result.breakdown?.salePrice,
        profit: result.breakdown?.profit,
        marginPercent: result.breakdown?.marginPercent,
        targetSnapshot: result.target as any,
        breakdown: (result.breakdown ?? null) as any,
      },
    });

    return { analysisId: analysis.id, ...result };
  });

  /** GET /analyses?storeId=&decision= */
  app.get("/analyses", async (req) => {
    const q = z.object({ storeId: z.string().optional(), decision: z.string().optional(), take: z.coerce.number().max(200).default(50) }).parse(req.query);
    return prisma.analysis.findMany({
      where: { storeId: q.storeId, decision: q.decision },
      include: { sourceProduct: true, listing: true },
      orderBy: { createdAt: "desc" },
      take: q.take,
    });
  });
}
