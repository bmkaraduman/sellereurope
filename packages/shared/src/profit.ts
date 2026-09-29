import { MARKETPLACES, type MarketplaceCode } from "./marketplaces.ts";
import type { ProfitBreakdown, ScrapedProduct, StoreRules, TargetSnapshot, Decision } from "./types.ts";

/** Very small FX table. Replace with a live source (ECB) in production. */
export type FxRates = Record<string, number>; // value of 1 unit in EUR
export const STATIC_FX: FxRates = { EUR: 1, SEK: 0.088, PLN: 0.232, GBP: 1.17 };

export function convert(amount: number, from: string, to: string, fx: FxRates = STATIC_FX): number {
  if (from === to) return amount;
  const inEur = amount * (fx[from] ?? 1);
  return inEur / (fx[to] ?? 1);
}

/**
 * Pick the price we would list at: slightly under the buy box (or lowest offer),
 * never below zero. Returns undefined if the target has no price signal at all.
 */
export function suggestSalePrice(target: TargetSnapshot, rules: StoreRules): number | undefined {
  const ref = target.buyBoxPrice ?? target.lowestPrice;
  if (!ref) return undefined;
  return round2(ref * rules.priceFactor);
}

export function computeBreakdown(
  product: ScrapedProduct,
  target: TargetSnapshot,
  salePrice: number,
  rules: StoreRules,
  fx: FxRates = STATIC_FX,
): ProfitBreakdown {
  const targetMp = MARKETPLACES[target.targetMarketplace];
  const sourceMp = MARKETPLACES[product.sourceMarketplace];

  const sourceCost = convert(product.price, product.currency, targetMp.currency, fx);
  const sourceShipping = convert(product.shipping, product.currency, targetMp.currency, fx);

  // Referral fee: use SP-API estimate when present, otherwise assume 15 %.
  const referralFee = target.referralFee ?? round2(salePrice * 0.15);
  const otherFees = target.otherFees ?? 0;

  // VAT: as seller you owe output VAT on the sale price in the target country
  // (EU OSS rules: VAT of the destination country). If VAT registered you can
  // reclaim the input VAT paid on the source purchase.
  const outputVat = salePrice - salePrice / (1 + targetMp.vat);
  const inputVat = rules.vatRegistered ? sourceCost - sourceCost / (1 + sourceMp.vat) : 0;
  const vatNet = round2(outputVat - inputVat);

  const overhead = rules.overhead;
  const profit = round2(salePrice - sourceCost - sourceShipping - referralFee - otherFees - vatNet - overhead);
  const marginPercent = salePrice > 0 ? round2((profit / salePrice) * 100) : 0;
  const cost = sourceCost + sourceShipping;
  const roiPercent = cost > 0 ? round2((profit / cost) * 100) : 0;

  return { salePrice, sourceCost: round2(sourceCost), sourceShipping: round2(sourceShipping), referralFee, otherFees, vatNet, overhead, profit, marginPercent, roiPercent };
}

export function decide(
  product: ScrapedProduct,
  target: TargetSnapshot,
  rules: StoreRules,
  fx: FxRates = STATIC_FX,
): { decision: Decision; reasons: string[]; breakdown?: ProfitBreakdown } {
  const reasons: string[] = [];

  if (!target.asinExists) return { decision: "SKIP", reasons: ["ASIN does not exist on target marketplace"] };
  if (!product.inStock) reasons.push("Source is out of stock");
  if (rules.requireSourcePrime && !product.isPrime) reasons.push("Source offer is not Prime");
  if (rules.skipIfAmazonSells && target.amazonSells) reasons.push("Amazon sells this ASIN on target");
  if (rules.maxSourcePrice && product.price > rules.maxSourcePrice) reasons.push("Source price above maxSourcePrice");

  let restricted = false;
  if (target.restrictions.length) {
    restricted = true;
    reasons.push(`Listing restricted: ${target.restrictions.join("; ")}`);
  }

  const salePrice = suggestSalePrice(target, rules);
  if (salePrice === undefined) {
    reasons.push("No price signal on target (no buy box / offers)");
    return { decision: "MANUAL_REVIEW", reasons };
  }

  const breakdown = computeBreakdown(product, target, salePrice, rules, fx);
  if (breakdown.profit < rules.minProfit) reasons.push(`Profit ${breakdown.profit} < min ${rules.minProfit}`);
  if (breakdown.marginPercent < rules.minMarginPercent) reasons.push(`Margin ${breakdown.marginPercent}% < min ${rules.minMarginPercent}%`);

  if (restricted && rules.skipIfRestricted) return { decision: "SKIP", reasons, breakdown };
  if (reasons.length === 0) return { decision: "LIST", reasons: ["Meets all rules"], breakdown };
  if (restricted) return { decision: "MANUAL_REVIEW", reasons, breakdown };
  return { decision: "SKIP", reasons, breakdown };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type { MarketplaceCode };
