/**
 * Verifies SP-API credentials in .env by calling the Sellers API
 * (no roles needed) and listing which marketplaces the account participates in.
 *
 *   pnpm --filter @sellereurope/api check
 */
import { ENV_PATH } from "../loadEnv.ts";
import { SpApiClient } from "@sellereurope/sp-api";
import { marketplaceById } from "@sellereurope/shared";

const need = ["SP_API_CLIENT_ID", "SP_API_CLIENT_SECRET", "SP_API_REFRESH_TOKEN", "SP_API_SELLER_ID"] as const;
const missing = need.filter((k) => !process.env[k] || process.env[k]!.includes("xxxx"));
if (!ENV_PATH) {
  console.error("No .env file found. Create one in the repository root: cp .env.example .env");
  process.exit(1);
}
console.log(`Using ${ENV_PATH}`);
if (missing.length) {
  console.error(`Still placeholder / missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new SpApiClient({
  clientId: process.env.SP_API_CLIENT_ID!,
  clientSecret: process.env.SP_API_CLIENT_SECRET!,
  refreshToken: process.env.SP_API_REFRESH_TOKEN!,
  sellerId: process.env.SP_API_SELLER_ID!,
  endpoint: process.env.SP_API_ENDPOINT,
});

try {
  const res = await client.get<any>("/sellers/v1/marketplaceParticipations");
  const rows = (res.payload ?? []).map((p: any) => {
    const mp = marketplaceById(p.marketplace.id);
    return { code: mp?.code ?? "?", domain: p.marketplace.domainName, currency: p.marketplace.defaultCurrencyCode, active: p.participation.isParticipating };
  });
  console.log("LWA token OK. Marketplace participations:");
  console.table(rows);
  const eu = rows.filter((r: any) => r.code !== "?" && r.active).map((r: any) => r.code);
  console.log(`Usable EU marketplaces for SellerEurope: ${eu.join(", ") || "none"}`);
} catch (e: any) {
  console.error("SP-API call failed:", e.message);
  if (e.status === 403) console.error("403 usually means: wrong seller id, app not authorized for this account, or refresh token from another app.");
  if (e.status === 401) console.error("401 usually means: client id/secret or refresh token is wrong.");
  process.exit(1);
}
