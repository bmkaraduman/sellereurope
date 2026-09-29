import { marketplaceByDomain, type ScrapedProduct } from "@sellereurope/shared";

const txt = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? "";

/** Parse "1.234,56 €", "€ 1.234,56", "1,234.56", "SEK 129,00" into a number. */
export function parsePrice(raw: string): number {
  const m = raw.replace(/\s/g, "").match(/[\d.,]+/);
  if (!m) return NaN;
  let s = m[0];
  const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  return Number(s);
}

export function scrapeCurrentPage(): ScrapedProduct | null {
  const mp = marketplaceByDomain(location.hostname);
  if (!mp) return null;

  const asin =
    (document.getElementById("ASIN") as HTMLInputElement | null)?.value ||
    document.querySelector<HTMLElement>("[data-asin]")?.dataset.asin ||
    location.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/)?.[1];
  if (!asin) return null;

  const priceRaw =
    txt("#corePrice_feature_div .a-offscreen") ||
    txt("#corePriceDisplay_desktop_feature_div .a-offscreen") ||
    txt("#apex_desktop .a-offscreen") ||
    txt("#priceblock_ourprice") ||
    txt("#price_inside_buybox") ||
    txt(".a-price .a-offscreen");
  const price = parsePrice(priceRaw);

  const shippingRaw = txt("#deliveryBlockMessage") + " " + txt("#mir-layout-DELIVERY_BLOCK");
  const shippingMatch = shippingRaw.match(/(\d+[.,]\d{2})\s*(€|EUR|SEK|zł|PLN|£)/i);
  const shipping = shippingMatch ? parsePrice(shippingMatch[1]) : 0;

  const availability = txt("#availability").toLowerCase();
  const inStock = availability !== "" && !/non disponibile|nicht verfügbar|no disponible|indisponible|niet beschikbaar|unavailable|currently unavailable/.test(availability);

  const isPrime = !!document.querySelector("#priceBadging_feature_div i.a-icon-prime, #primeBadge, .a-icon-prime, [aria-label*='Prime']");
  const soldBy = txt("#sellerProfileTriggerId") || txt("#merchantInfo") || txt("#merchant-info") || "";

  return {
    asin,
    sourceMarketplace: mp.code,
    title: txt("#productTitle"),
    price,
    currency: mp.currency,
    shipping,
    inStock,
    isPrime,
    soldBy,
    imageUrl: (document.querySelector("#landingImage") as HTMLImageElement | null)?.src,
    brand: txt("#bylineInfo").replace(/^(Marke|Marca|Marque|Brand|Merk):\s*/i, "").replace(/^(Besuche den|Visita lo|Visitez la|Visit the|Visita la).*Store$/i, "").trim() || undefined,
    category: txt("#wayfinding-breadcrumbs_feature_div").replace(/\s+/g, " "),
    url: location.origin + location.pathname,
    scrapedAt: new Date().toISOString(),
  };
}
