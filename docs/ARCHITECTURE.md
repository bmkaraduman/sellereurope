# SellerEurope – Mimari

```
 amazon.it (kaynak)                      amazon.de (hedef)
      │                                        ▲
      │ 1. content script sayfayı okur         │ 6. Listings Items API ile teklif
      ▼                                        │
 ┌────────────────┐   2. POST /analyze   ┌─────┴──────────┐   3-5. SP-API (EU endpoint)
 │ Chrome uzantısı│ ───────────────────▶ │  apps/api      │ ──▶ Catalog / Pricing / Fees /
 │ apps/extension │ ◀─────────────────── │  Fastify+Prisma│     Restrictions / Orders
 └────────────────┘   LIST/SKIP + kâr    └─────┬──────────┘
                                               │
                                        ┌──────▼─────────┐
                                        │  apps/web      │  panel: mağazalar, analizler,
                                        │  Next.js       │  listelemeler, siparişler
                                        └────────────────┘
```

## Paketler

| Yol | İçerik |
|---|---|
| `packages/shared` | EU pazar yeri tablosu (marketplace id, domain, para birimi, KDV), tipler, **kâr motoru** (`decide()`), testler |
| `packages/sp-api` | LWA token, HTTP istemcisi (429 retry), Catalog / Pricing / Fees / Restrictions / Listings / Orders sarmalayıcıları |
| `apps/api` | REST API: `/stores`, `/analyze`, `/analyses`, `/listings`, `/orders/sync`. Prisma + PostgreSQL |
| `apps/extension` | MV3 eklenti: ürün sayfasını kazır, API'ye gönderir, popup'ta karar + kâr dökümünü gösterir, tek tıkla listeler |
| `apps/web` | Next.js panel |

## Karar akışı (`packages/shared/src/profit.ts`)

1. ASIN hedef pazarda yoksa → **SKIP**
2. Kaynak stokta değil / Prime değil / Amazon hedefte kendisi satıyor → **SKIP**
3. Hedefte hiç fiyat sinyali yoksa → **MANUAL_REVIEW**
4. Satış fiyatı = (buy box ya da en düşük teklif) × `priceFactor`
5. Kâr = satış − kaynak maliyet − kargo − Amazon komisyonu − net KDV − sabit gider
6. Kâr ≥ `minProfit` ve marj ≥ `minMarginPercent` → **LIST**, değilse **SKIP**
7. Kısıtlı ASIN: `skipIfRestricted` ise SKIP, değilse MANUAL_REVIEW

## Yol haritası

- [ ] Repricer: `Listing` tablosundaki ürünlerin hedef fiyatını periyodik yenile (cron + `patchPriceAndQuantity`)
- [ ] Kaynak stok/fiyat takibi: eklenti ya da headless tarayıcıyla kaynak sayfayı yeniden kazı, fiyat yükseldiyse stoğu 0'a çek
- [ ] Sipariş akışı: `/orders/sync` → kaynak pazarda satın alma (manuel ya da yarı otomatik) → `sourceOrderId` + kargo takip → Orders API `confirmShipment`
- [ ] Canlı döviz kuru (ECB) – `STATIC_FX` yerine
- [ ] Toplu tarama: arama/kategori sayfalarından çoklu ASIN toplama
- [ ] Çoklu kullanıcı / auth (şu an tek `API_TOKEN`)
