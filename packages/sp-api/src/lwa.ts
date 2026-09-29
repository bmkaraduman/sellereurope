import { LWA_TOKEN_ENDPOINT } from "@sellereurope/shared";

export interface LwaCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface CachedToken { accessToken: string; expiresAt: number }

/**
 * Login-With-Amazon access token provider. Since Oct 2023 SP-API only needs
 * the LWA access token (no AWS SigV4 signing) for regular seller operations.
 */
export class LwaTokenProvider {
  private cache?: CachedToken;
  constructor(private creds: LwaCredentials, private fetchImpl: typeof fetch = fetch) {}

  async getAccessToken(): Promise<string> {
    if (this.cache && this.cache.expiresAt - 60_000 > Date.now()) return this.cache.accessToken;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.creds.refreshToken,
      client_id: this.creds.clientId,
      client_secret: this.creds.clientSecret,
    });
    const res = await this.fetchImpl(LWA_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    });
    if (!res.ok) throw new Error(`LWA token refresh failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.cache = { accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }
}
