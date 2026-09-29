import { MARKETPLACES, decide, type AnalysisResult, type ScrapedProduct, type StoreRules, type TargetSnapshot, type MarketplaceCode } from "@sellereurope/shared";
import { SpApiClient, getCatalogItem, getItemOffers, getFeesEstimate, getListingRestrictions } from "@sellereurope/sp-api";

/**
 * Core pipeline:
 *   1. Does the ASIN exist on the target marketplace?  (Catalog Items)
 *   2. What does it sell for there?                    (Product Pricing)
 *   3. What will Amazon charge us?                     (Product Fees)
 *   4. Are we allowed to list it?                      (Listings Restrictions)
 *   5. Apply store rules -> LIST / SKIP / MANUAL_REVIEW
 */
export async function analyzeProduct(
  client: SpApiClient,
  product: ScrapedProduct,
  targetMarketplace: MarketplaceCode,
  rules: StoreRules,
): Promise<AnalysisResult> {
  const mp = MARKETPLACES[targetMarketplace];

  const catalog = await getCatalogItem(client, product.asin, mp.id);
  const snapshot: TargetSnapshot = {
    targetMarketplace,
    asinExists: !!catalog,
    currency: mp.currency,
    restrictions: [],
  };

  if (catalog) {
    snapshot.salesRank = catalog.salesRanks?.[0]?.displayGroupRanks?.[0]?.rank;

    const [offers, restrictions] = await Promise.all([
      getItemOffers(client, product.asin, mp.id).catch(() => undefined),
      getListingRestrictions(client, product.asin, mp.id).catch(() => [] as string[]),
    ]);
    if (offers) {
      snapshot.buyBoxPrice = offers.buyBoxPrice;
      snapshot.lowestPrice = offers.lowestPrice;
      snapshot.offerCount = offers.offerCount;
      snapshot.amazonSells = offers.amazonSells;
      snapshot.currency = offers.currency;
    }
    snapshot.restrictions = restrictions;

    const ref = snapshot.buyBoxPrice ?? snapshot.lowestPrice;
    if (ref) {
      const fees = await getFeesEstimate(client, product.asin, mp.id, ref * rules.priceFactor, snapshot.currency).catch(() => null);
      if (fees) {
        snapshot.referralFee = fees.referralFee;
        snapshot.otherFees = fees.otherFees;
      }
    }
  }

  const { decision, reasons, breakdown } = decide(product, snapshot, rules);
  return {
    asin: product.asin,
    sourceMarketplace: product.sourceMarketplace,
    targetMarketplace,
    decision,
    reasons,
    breakdown,
    target: snapshot,
    analyzedAt: new Date().toISOString(),
  };
}

export function rulesFromStore(store: {
  minProfit: number; minMarginPercent: number; maxSourcePrice: number | null; requireSourcePrime: boolean;
  skipIfAmazonSells: boolean; skipIfRestricted: boolean; priceFactor: number; overhead: number; vatRegistered: boolean;
  outboundShipping: number; depotCountry: string;
}): StoreRules {
  return {
    minProfit: store.minProfit,
    minMarginPercent: store.minMarginPercent,
    maxSourcePrice: store.maxSourcePrice ?? undefined,
    requireSourcePrime: store.requireSourcePrime,
    skipIfAmazonSells: store.skipIfAmazonSells,
    skipIfRestricted: store.skipIfRestricted,
    priceFactor: store.priceFactor,
    overhead: store.overhead,
    outboundShipping: store.outboundShipping,
    depotCountry: store.depotCountry,
    vatRegistered: store.vatRegistered,
  };
}
