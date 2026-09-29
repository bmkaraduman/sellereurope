import { SP_API_EU_ENDPOINT } from "@sellereurope/shared";
import { LwaTokenProvider, type LwaCredentials } from "./lwa.ts";

export interface SpApiConfig extends LwaCredentials {
  sellerId: string;
  endpoint?: string;
}

export class SpApiError extends Error {
  constructor(public status: number, public body: string, public path: string) {
    super(`SP-API ${status} on ${path}: ${body.slice(0, 500)}`);
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined>;

/**
 * Minimal SP-API HTTP client with LWA auth, JSON handling and a simple
 * retry on 429 (rate limit) / 5xx.
 */
export class SpApiClient {
  readonly endpoint: string;
  readonly sellerId: string;
  private tokens: LwaTokenProvider;

  constructor(cfg: SpApiConfig, private fetchImpl: typeof fetch = fetch) {
    this.endpoint = cfg.endpoint ?? SP_API_EU_ENDPOINT;
    this.sellerId = cfg.sellerId;
    this.tokens = new LwaTokenProvider(cfg, fetchImpl);
  }

  async request<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T> {
    const url = new URL(path, this.endpoint);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v === undefined) continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    let attempt = 0;
    for (;;) {
      const token = await this.tokens.getAccessToken();
      const res = await this.fetchImpl(url, {
        method,
        headers: {
          "x-amz-access-token": token,
          "content-type": "application/json",
          "user-agent": "sellereurope/0.1 (Language=TypeScript)",
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      if (res.ok) {
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
      }
      const text = await res.text();
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < 4) {
        attempt++;
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      throw new SpApiError(res.status, text, path);
    }
  }

  get<T>(path: string, query?: Query) { return this.request<T>("GET", path, { query }); }
  post<T>(path: string, body?: unknown, query?: Query) { return this.request<T>("POST", path, { body, query }); }
  put<T>(path: string, body?: unknown, query?: Query) { return this.request<T>("PUT", path, { body, query }); }
  patch<T>(path: string, body?: unknown, query?: Query) { return this.request<T>("PATCH", path, { body, query }); }
  delete<T>(path: string, query?: Query) { return this.request<T>("DELETE", path, { query }); }
}
