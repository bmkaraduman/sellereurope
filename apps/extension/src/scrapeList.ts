import { marketplaceByDomain, type ScanItem } from "@sellereurope/shared";
import { parsePrice } from "./scrape.ts";

const ASIN_RE = /^[A-Z0-9]{10}$/;

/**
 * Collect product cards from search results, category browse pages and
 * Bestseller / Movers & Shakers pages. Returns [] on non-list pages.
 */
export function scrapeListPage(): { items: ScanItem[]; label: string } {
  const mp = marketplaceByDomain(location.hostname);
  if (!mp) return { items: [], label: "" };
  const items = new Map<string, ScanItem>();

  // 1) Search results / browse: <div data-asin="..." data-component-type="s-search-result">
  document.querySelectorAll<HTMLElement>('[data-component-type="s-search-result"][data-asin], div.s-result-item[data-asin]').forEach((card) => {
    const asin = card.dataset.asin ?? "";
    if (!ASIN_RE.test(asin)) return;
    // skip sponsored placements: they are usually not organic buy-box comparable
    if (card.querySelector(".puis-sponsored-label-text, [data-component-type='sp-sponsored-result']")) return;
    const price = parsePrice(card.querySelector(".a-price .a-offscreen")?.textContent ?? "");
    items.set(asin, {
      asin,
      title: card.querySelector("h2")?.textContent?.trim() ?? "",
      price: Number.isFinite(price) ? price : undefined,
      currency: mp.currency,
      isPrime: !!card.querySelector(".a-icon-prime, [aria-label*='Prime']"),
      rating: parseRating(card.querySelector(".a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt")?.textContent),
      reviewCount: parseInt((card.querySelector("[aria-label$='ratings'], .s-underline-text")?.textContent ?? "").replace(/[^\d]/g, "")) || undefined,
      imageUrl: (card.querySelector("img.s-image") as HTMLImageElement | null)?.src,
      url: `${location.origin}/dp/${asin}`,
    });
  });

  // 2) Bestsellers / New releases / Movers & Shakers: grid items carry a JSON blob in data-p13n-asin-metadata
  document.querySelectorAll<HTMLElement>("[data-p13n-asin-metadata], #gridItemRoot, .p13n-sc-uncoverable-faceout").forEach((card) => {
    let asin = "";
    try { asin = JSON.parse(card.dataset.p13nAsinMetadata ?? "{}").asin ?? ""; } catch { /* ignore */ }
    if (!asin) asin = card.querySelector<HTMLAnchorElement>("a[href*='/dp/']")?.href.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? "";
    if (!ASIN_RE.test(asin) || items.has(asin)) return;
    const price = parsePrice(card.querySelector("._cDEzb_p13n-sc-price_3mJ9Z, .p13n-sc-price, .a-color-price")?.textContent ?? "");
    items.set(asin, {
      asin,
      title: card.querySelector("._cDEzb_p13n-sc-css-line-clamp-3_g3dy1, .p13n-sc-truncate, .p13n-sc-truncated")?.textContent?.trim() ?? "",
      price: Number.isFinite(price) ? price : undefined,
      currency: mp.currency,
      isPrime: !!card.querySelector(".a-icon-prime"),
      rating: parseRating(card.querySelector(".a-icon-alt")?.textContent),
      imageUrl: (card.querySelector("img") as HTMLImageElement | null)?.src,
      url: `${location.origin}/dp/${asin}`,
    });
  });

  const label = document.title.replace(/\s*[:|-]\s*Amazon\.[a-z.]+.*$/i, "").trim().slice(0, 120) || location.pathname;
  return { items: [...items.values()], label };
}

function parseRating(txt?: string | null): number | undefined {
  const m = txt?.match(/([\d][.,]\d)/);
  return m ? Number(m[1].replace(",", ".")) : undefined;
}
