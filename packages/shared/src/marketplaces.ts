/**
 * Amazon EU marketplaces. All of these are served by the single EU SP-API
 * region endpoint (https://sellingpartnerapi-eu.amazon.com) and can be sold
 * on with ONE "Europe unified" seller account.
 */
export type MarketplaceCode =
  | "DE" | "FR" | "IT" | "ES" | "NL" | "SE" | "PL" | "BE" | "IE" | "UK";

export interface Marketplace {
  code: MarketplaceCode;
  /** Amazon marketplace id used by SP-API */
  id: string;
  domain: string;
  currency: "EUR" | "SEK" | "PLN" | "GBP";
  /** Standard VAT rate (as fraction). Reduced rates are not modelled yet. */
  vat: number;
  /** ISO 3166-1 alpha-2 country. */
  country: string;
  /** Whether the marketplace is inside the EU customs union. */
  eu: boolean;
}

export const MARKETPLACES: Record<MarketplaceCode, Marketplace> = {
  DE: { code: "DE", id: "A1PA6795UKMFR9", domain: "amazon.de",    currency: "EUR", vat: 0.19, country: "DE", eu: true },
  FR: { code: "FR", id: "A13V1IB3VIYZZH", domain: "amazon.fr",    currency: "EUR", vat: 0.20, country: "FR", eu: true },
  IT: { code: "IT", id: "APJ6JRA9NG5V4",  domain: "amazon.it",    currency: "EUR", vat: 0.22, country: "IT", eu: true },
  ES: { code: "ES", id: "A1RKKUPIHCS9HS", domain: "amazon.es",    currency: "EUR", vat: 0.21, country: "ES", eu: true },
  NL: { code: "NL", id: "A1805IZSGTT6HS", domain: "amazon.nl",    currency: "EUR", vat: 0.21, country: "NL", eu: true },
  SE: { code: "SE", id: "A2NODRKZP88ZB9", domain: "amazon.se",    currency: "SEK", vat: 0.25, country: "SE", eu: true },
  PL: { code: "PL", id: "A1C3SOZRARQ6R3", domain: "amazon.pl",    currency: "PLN", vat: 0.23, country: "PL", eu: true },
  BE: { code: "BE", id: "AMEN7PMS3EDWL",  domain: "amazon.com.be",currency: "EUR", vat: 0.21, country: "BE", eu: true },
  IE: { code: "IE", id: "A28R8C7NBKEWEA", domain: "amazon.ie",    currency: "EUR", vat: 0.23, country: "IE", eu: true },
  UK: { code: "UK", id: "A1F83G8C2ARO7P", domain: "amazon.co.uk", currency: "GBP", vat: 0.20, country: "GB", eu: false },
};

export const SP_API_EU_ENDPOINT = "https://sellingpartnerapi-eu.amazon.com";
export const LWA_TOKEN_ENDPOINT = "https://api.amazon.com/auth/o2/token";

export function marketplaceByDomain(hostname: string): Marketplace | undefined {
  const host = hostname.replace(/^www\./, "");
  return Object.values(MARKETPLACES).find((m) => m.domain === host);
}

export function marketplaceById(id: string): Marketplace | undefined {
  return Object.values(MARKETPLACES).find((m) => m.id === id);
}
