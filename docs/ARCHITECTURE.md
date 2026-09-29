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
                                        │  Next.js       │  listelemeler, sipariş/depo akışı
                                        └────────────────┘
```

## Paketler

| Yol | İçerik |
|---|---|
| `packages/shared` | EU pazar yeri tablosu (marketplace id, domain, para birimi, KDV), tipler, **kâr motoru** (`decide()`), testler |
| `packages/sp-api` | LWA token, HTTP istemcisi (429 retry), Catalog / Pricing / Fees / Restrictions / Listings / Orders sarmalayıcıları |
| `apps/api` | REST API: `/stores`, `/analyze`, `/analyses`, `/scans`, `/listings`, `/listings/bulk`, `/orders/*`. Prisma + PostgreSQL |
| `apps/extension` | MV3 eklenti: ürün sayfasını kazır, API'ye gönderir, popup'ta karar + kâr dökümünü gösterir, tek tıkla listeler |
| `apps/web` | Next.js panel |

## Karar akışı (`packages/shared/src/profit.ts`)

1. ASIN hedef pazarda yoksa → **SKIP**
2. Kaynak stokta değil / Prime değil / Amazon hedefte kendisi satıyor → **SKIP**
3. Hedefte hiç fiyat sinyali yoksa → **MANUAL_REVIEW**
4. Satış fiyatı = (buy box ya da en düşük teklif) × `priceFactor`
5. Kâr = satış − kaynak maliyet − kaynak→depo kargo − depo→müşteri kargo − Amazon komisyonu − net KDV − paketleme
6. Kâr ≥ `minProfit` ve marj ≥ `minMarginPercent` → **LIST**, değilse **SKIP**
7. Kısıtlı ASIN: `skipIfRestricted` ise SKIP, değilse MANUAL_REVIEW

## Yol haritası

- [ ] Repricer: `Listing` tablosundaki ürünlerin hedef fiyatını periyodik yenile (cron + `patchPriceAndQuantity`)
- [ ] Kaynak stok/fiyat takibi: eklenti ya da headless tarayıcıyla kaynak sayfayı yeniden kazı, fiyat yükseldiyse stoğu 0'a çek
- [x] Sipariş akışı (depo modeli): `/orders/sync` → `source-ordered` → `received` → `ship` (Orders API `confirmShipment`)
- [ ] Kaynak siparişini yarı otomatik verme (eklenti sepete ekleme + depo adresi otomatik doldurma)
- [ ] Kargo etiketi üretimi (DHL / DPD / GLS API) ve takip numarasını otomatik geri yazma
- [ ] Canlı döviz kuru (ECB) – `STATIC_FX` yerine
- [x] Toplu tarama: arama/kategori/Bestseller sayfalarından ASIN toplama → `/scans` (20'li batch Catalog + Pricing + Fees, arka planda) → panelde filtrele, seç, toplu listele
- [ ] Çoklu kullanıcı / auth (şu an tek `API_TOKEN`)
