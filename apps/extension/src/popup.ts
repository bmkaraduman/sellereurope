import type { ScrapedProduct } from "@sellereurope/shared";
import { getSettings, type AnalyzeResponse, type Msg, type Settings } from "./messages.ts";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let product: ScrapedProduct | null = null;
let lastAnalysis: AnalyzeResponse | null = null;

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadProduct() {
  const tab = await activeTab();
  if (!tab?.id) return;
  try {
    product = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE" } satisfies Msg);
  } catch { product = null; }
  if (product) {
    $("product").innerHTML = `<b>${product.asin}</b> · ${product.sourceMarketplace} · ${product.price.toFixed(2)} ${product.currency}${product.isPrime ? " · Prime" : ""}<br><span class="muted">${product.title.slice(0, 90)}</span>`;
  }
}

function render(a: AnalyzeResponse) {
  const b = a.breakdown;
  const rows = b ? `
    <table>
      <tr><td>Sale price (${a.targetMarketplace})</td><td>${b.salePrice.toFixed(2)}</td></tr>
      <tr><td>Source cost + shipping</td><td>${(b.sourceCost + b.sourceShipping).toFixed(2)}</td></tr>
      <tr><td>Amazon fees</td><td>${(b.referralFee + b.otherFees).toFixed(2)}</td></tr>
      <tr><td>VAT (net)</td><td>${b.vatNet.toFixed(2)}</td></tr>
      <tr><td>Overhead</td><td>${b.overhead.toFixed(2)}</td></tr>
      <tr><td><b>Profit</b></td><td><b>${b.profit.toFixed(2)} (${b.marginPercent}% / ROI ${b.roiPercent}%)</b></td></tr>
    </table>` : "";
  $("result").innerHTML = `
    <span class="decision ${a.decision}">${a.decision}</span>
    <ul>${a.reasons.map((r) => `<li>${r}</li>`).join("")}</ul>
    ${rows}
    <div class="muted">Target buy box: ${a.target.buyBoxPrice ?? "-"} · offers: ${a.target.offerCount ?? "-"} · rank: ${a.target.salesRank ?? "-"}</div>`;
  ($("list") as HTMLButtonElement).disabled = a.decision === "SKIP";
}

$("analyze").addEventListener("click", async () => {
  if (!product) return;
  const s = await getSettings();
  if (!s.storeId) { $("result").textContent = "Set a Store ID in settings first."; return; }
  $("result").textContent = "Analysing…";
  const res = await chrome.runtime.sendMessage({ type: "ANALYZE", product, storeId: s.storeId } satisfies Msg);
  if (!res.ok) { $("result").textContent = `Error: ${res.error}`; return; }
  lastAnalysis = res.data;
  render(res.data);
});

$("list").addEventListener("click", async () => {
  if (!lastAnalysis) return;
  const res = await chrome.runtime.sendMessage({ type: "LIST", analysisId: lastAnalysis.analysisId } satisfies Msg);
  $("result").insertAdjacentHTML("beforeend", res.ok ? `<p>Listing ${res.data.sku}: <b>${res.data.status}</b></p>` : `<p>Error: ${res.error}</p>`);
});

$("save").addEventListener("click", async () => {
  const s: Settings = { apiUrl: ($("apiUrl") as HTMLInputElement).value, apiToken: ($("apiToken") as HTMLInputElement).value, storeId: ($("storeId") as HTMLInputElement).value };
  await chrome.storage.sync.set(s);
});

(async () => {
  const s = await getSettings();
  ($("apiUrl") as HTMLInputElement).value = s.apiUrl;
  ($("apiToken") as HTMLInputElement).value = s.apiToken;
  ($("storeId") as HTMLInputElement).value = s.storeId;
  await loadProduct();
})();
