import { getSettings, type Msg } from "./messages.ts";

async function api(path: string, init: RequestInit = {}) {
  const s = await getSettings();
  const res = await fetch(`${s.apiUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${s.apiToken}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "ANALYZE") {
        sendResponse({ ok: true, data: await api("/analyze", { method: "POST", body: JSON.stringify({ storeId: msg.storeId, product: msg.product }) }) });
      } else if (msg.type === "SCAN") {
        sendResponse({ ok: true, data: await api("/scans", { method: "POST", body: JSON.stringify({ storeId: msg.storeId, sourceMarketplace: msg.sourceMarketplace, sourceLabel: msg.sourceLabel, items: msg.items }) }) });
      } else if (msg.type === "LIST") {
        sendResponse({ ok: true, data: await api("/listings", { method: "POST", body: JSON.stringify({ analysisId: msg.analysisId }) }) });
      }
    } catch (e: any) {
      sendResponse({ ok: false, error: String(e?.message ?? e) });
    }
  })();
  return true;
});
