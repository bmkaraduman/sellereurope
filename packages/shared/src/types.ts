import type { MarketplaceCode } from "./marketplaces.ts";

/** What the browser extension scrapes from a source product page. */
export interface ScrapedProduct {
  asin: string;
  sourceMarketplace: MarketplaceCode;
  title: string;
  /** Price the buyer pays on the source marketplace, VAT included. */
  price: number;
  currency: string;
  /** Shipping cost to the *target* country if shown, else 0. */
  shipping: number;
  inStock: boolean;
  isPrime: boolean;
  /** "Amazon" | "third-party" | seller name */
  soldBy: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  url: string;
  scrapedAt: string; // ISO date
}

/** Live data pulled from the target marketplace through SP-API. */
export interface TargetSnapshot {
  targetMarketplace: MarketplaceCode;
  asinExists: boolean;
  /** Current Buy Box landed price on target, VAT included, in target currency. */
  buyBoxPrice?: number;
  /** Lowest FBM/new offer on target. */
  lowestPrice?: number;
  offerCount?: number;
  currency: string;
  referralFee?: number;
  /** Estimated FBM closing/variable fees, 0 for most categories. */
  otherFees?: number;
  /** Listing restriction reasons (empty = free to list). */
  restrictions: string[];
  /** Amazon itself is a seller on this ASIN. */
  amazonSells?: boolean;
  salesRank?: number;
}

export type Decision = "LIST" | "SKIP" | "MANUAL_REVIEW";

export interface ProfitBreakdown {
  /** Planned sale price on target, VAT included, target currency. */
  salePrice: number;
  /** Cost of buying on source, converted to target currency. */
  sourceCost: number;
  /** Shipping from source seller to your depot (usually 0 with Prime). */
  sourceShipping: number;
  /** Shipping from your depot to the end customer, with your own label. */
  outboundShipping: number;
  referralFee: number;
  otherFees: number;
  /** VAT you owe on the sale (output VAT) minus input VAT you can reclaim (if VAT-registered). */
  vatNet: number;
  /** Fixed per-order overhead (packaging, returns provision, payment costs...). */
  overhead: number;
  profit: number;
  marginPercent: number;
  roiPercent: number;
}

export interface AnalysisResult {
  asin: string;
  sourceMarketplace: MarketplaceCode;
  targetMarketplace: MarketplaceCode;
  decision: Decision;
  reasons: string[];
  breakdown?: ProfitBreakdown;
  target: TargetSnapshot;
  analyzedAt: string;
}

export interface StoreRules {
  minProfit: number;          // in target currency
  minMarginPercent: number;   // 0-100
  maxSourcePrice?: number;    // skip very expensive items
  requireSourcePrime: boolean;
  skipIfAmazonSells: boolean;
  skipIfRestricted: boolean;
  /** Multiply the best target price by this to undercut, e.g. 0.98 */
  priceFactor: number;
  /** Packaging / relabelling / handling cost per order in target currency. */
  overhead: number;
  /** Average cost of shipping one parcel from your depot to a customer in the target country. */
  outboundShipping: number;
  /** Country where your depot is (ISO code), used for docs/routing; shipping cost is `outboundShipping`. */
  depotCountry: string;
  /** true when you are VAT registered and can reclaim input VAT. */
  vatRegistered: boolean;
}

export const DEFAULT_RULES: StoreRules = {
  minProfit: 3,
  minMarginPercent: 15,
  requireSourcePrime: true,
  skipIfAmazonSells: true,
  skipIfRestricted: true,
  priceFactor: 0.99,
  overhead: 1.0,
  outboundShipping: 5.5,
  depotCountry: "DE",
  vatRegistered: false,
};
