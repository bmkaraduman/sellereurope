const API_URL = process.env.API_URL ?? "http://localhost:4000";
const API_TOKEN = process.env.API_TOKEN ?? "";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", authorization: `Bearer ${API_TOKEN}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}
