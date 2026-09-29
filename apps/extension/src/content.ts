import { scrapeCurrentPage } from "./scrape.ts";
import type { Msg } from "./messages.ts";

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  if (msg.type === "SCRAPE") {
    sendResponse(scrapeCurrentPage());
  }
  return true;
});

// Small on-page badge so the user knows the extension is active on a product page.
const product = scrapeCurrentPage();
if (product) {
  const badge = document.createElement("div");
  badge.textContent = `SellerEurope: ${product.asin}`;
  Object.assign(badge.style, { position: "fixed", bottom: "12px", right: "12px", zIndex: "99999", background: "#1d4ed8", color: "#fff", padding: "6px 10px", borderRadius: "6px", font: "12px sans-serif", opacity: "0.85" });
  document.body.appendChild(badge);
}
