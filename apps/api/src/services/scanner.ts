import { MARKETPLACES, decide, type MarketplaceCode, type ScanItem, type ScrapedProduct, type StoreRules, type TargetSnapshot } from "@sellereurope/shared";
import { SpApiClient, searchCatalogByAsins, getItemOffersBatch, getFeesEstimates, getListingRestrictions } from "@sellereurope/sp-api";
import { prisma } from "../db.ts";
import { rulesFromStore } from "./analyzer.ts";

/**
 * Bulk pipeline for a list of ASINs collected from a source list page.
 *   1. Catalog search (20/call)  -> which ASINs exist on target
 *   2. Pricing batch (20/call)   -> buy box / lowest / amazonSells
 *   3. Fees batch (20/call)      -> referral fee at suggested price
 *   4. Rules                     -> LIST / SKIP / MANUAL_REVIEW
 *   5. Restrictions              -> only for LIST candidates (no batch endpoint)
 * Runs in the background; progress is written to the Scan row.
 */
export async function runScan(client: SpApiClient, scanId: string, items: ScanItem[]): Promise<void> {
  const scan = await prisma.scan.findUniqueOrThrow({ where: { id: scanId }, include: { store: true } });
  const rules = rulesFromStore(scan.store);
  const target = scan.store.targetMarketplace as MarketplaceCode;
  const source = scan.sourceMarketplace as MarketplaceCode;
  const mp = MARKETPLACES[target];

  await prisma.scan.update({ where: { id: scanId }, data: { status: "RUNNING" } });
  try {
    // de-dupe and drop items without a price (cannot compute profit)
    const seen = new Set<string>();
    const usable = items.filter((i) => i.price && !seen.has(i.asin) && seen.add(i.asin));
    const asins = usable.map((i) => i.asin);

    const catalog = await searchCatalogByAsins(client, asins, mp.id);
    const existing = asins.filter((a) => catalog.has(a));
    const offers = await getItemOffersBatch(client, existing, mp.id);

    const feeInputs = existing
      .map((a) => ({ asin: a, price: (offers.get(a)?.buyBoxPrice ?? offers.get(a)?.lowestPrice ?? 0) * rules.priceFactor }))
      .filter((f) => f.price > 0);
    const fees = await getFeesEstimates(client, feeInputs, mp.id, mp.currency);

    let listCount = 0;
    let processed = 0;
    for (const item of usable) {
      const product = toScraped(item, source);
      const hit = catalog.get(item.asin);
      const offer = offers.get(item.asin);
      const fee = fees.get(item.asin);
      const snapshot: TargetSnapshot = {
        targetMarketplace: target,
        asinExists: !!hit,
        currency: offer?.currency ?? mp.currency,
        buyBoxPrice: offer?.buyBoxPrice,
        lowestPrice: offer?.lowestPrice,
        offerCount: offer?.offerCount,
        amazonSells: offer?.amazonSells,
        referralFee: fee?.referralFee,
        otherFees: fee?.otherFees,
        salesRank: hit?.salesRank,
        restrictions: [],
      };

      let result = decide(product, snapshot, rules);
      if (result.decision === "LIST") {
        snapshot.restrictions = await getListingRestrictions(client, item.asin, mp.id).catch(() => []);
        if (snapshot.restrictions.length) result = decide(product, snapshot, rules);
      }
      if (result.decision === "LIST") listCount++;

      const sourceProduct = await prisma.sourceProduct.create({ data: { ...product, scrapedAt: new Date(product.scrapedAt), category: undefined } as any });
      await prisma.analysis.create({
        data: {
          storeId: scan.storeId,
          scanId,
          sourceProductId: sourceProduct.id,
          decision: result.decision,
          reasons: result.reasons,
          salePrice: result.breakdown?.salePrice,
          profit: result.breakdown?.profit,
          marginPercent: result.breakdown?.marginPercent,
          targetSnapshot: snapshot as any,
          breakdown: (result.breakdown ?? null) as any,
        },
      });
      processed++;
      if (processed % 10 === 0) await prisma.scan.update({ where: { id: scanId }, data: { processed, listCount } });
    }
    await prisma.scan.update({ where: { id: scanId }, data: { status: "DONE", processed, listCount, finishedAt: new Date() } });
  } catch (e: any) {
    await prisma.scan.update({ where: { id: scanId }, data: { status: "ERROR", error: String(e?.message ?? e), finishedAt: new Date() } });
  }
}

function toScraped(item: ScanItem, source: MarketplaceCode): ScrapedProduct {
  return {
    asin: item.asin,
    sourceMarketplace: source,
    title: item.title,
    price: item.price ?? 0,
    currency: item.currency,
    shipping: 0,
    inStock: true,
    isPrime: item.isPrime,
    soldBy: "",
    imageUrl: item.imageUrl,
    url: item.url,
    scrapedAt: new Date().toISOString(),
  };
}
