import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, computeBreakdown } from "./profit.ts";
import { DEFAULT_RULES, type ScrapedProduct, type TargetSnapshot } from "./types.ts";

const product: ScrapedProduct = {
  asin: "B000TEST01", sourceMarketplace: "IT", title: "Test", price: 20, currency: "EUR",
  shipping: 0, inStock: true, isPrime: true, soldBy: "Amazon", url: "https://amazon.it/dp/B000TEST01",
  scrapedAt: new Date().toISOString(),
};

test("profitable item gets LIST", () => {
  const target: TargetSnapshot = { targetMarketplace: "DE", asinExists: true, buyBoxPrice: 55, currency: "EUR", referralFee: 8.17, restrictions: [], amazonSells: false };
  const r = decide(product, target, DEFAULT_RULES);
  assert.equal(r.decision, "LIST");
  assert.ok(r.breakdown!.profit > 3);
});

test("thin margin gets SKIP", () => {
  const target: TargetSnapshot = { targetMarketplace: "DE", asinExists: true, buyBoxPrice: 24, currency: "EUR", restrictions: [], amazonSells: false };
  const r = decide(product, target, DEFAULT_RULES);
  assert.equal(r.decision, "SKIP");
});

test("missing ASIN gets SKIP", () => {
  const target: TargetSnapshot = { targetMarketplace: "DE", asinExists: false, currency: "EUR", restrictions: [] };
  assert.equal(decide(product, target, DEFAULT_RULES).decision, "SKIP");
});

test("VAT is computed on target rate", () => {
  const target: TargetSnapshot = { targetMarketplace: "DE", asinExists: true, buyBoxPrice: 119, currency: "EUR", restrictions: [] };
  const b = computeBreakdown(product, target, 119, { ...DEFAULT_RULES, vatRegistered: false });
  assert.equal(b.vatNet, 19);
});

test("outbound shipping from own depot is deducted", () => {
  const target: TargetSnapshot = { targetMarketplace: "DE", asinExists: true, buyBoxPrice: 50, currency: "EUR", referralFee: 7.5, restrictions: [] };
  const base = computeBreakdown(product, target, 50, { ...DEFAULT_RULES, outboundShipping: 0 });
  const withShip = computeBreakdown(product, target, 50, { ...DEFAULT_RULES, outboundShipping: 6 });
  assert.equal(base.profit - withShip.profit, 6);
});
