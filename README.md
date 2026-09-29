# SellerEurope

Avrupa içi Amazon → Amazon arbitraj / dropshipping aracı. SellerFlash veya
SellerRunning'in ABD merkezli yaklaşımının aksine **sadece AB pazar yerleri**
arasında çalışır: örneğin amazon.it'te bulduğun ürünü, amazon.de'de var mı,
kaç paraya satılıyor, komisyon ve KDV sonrası kâr bırakıyor mu diye kontrol
eder; kurallara uyuyorsa Almanya mağazana tek tıkla listeler.

## Bileşenler

- `apps/extension` – Chrome eklentisi (MV3). Amazon EU ürün sayfasında "Analyse" → karar + kâr dökümü → "List on target".
- `apps/api` – Fastify + Prisma REST API, SP-API entegrasyonu.
- `apps/web` – Next.js panel (mağazalar, analizler, listelemeler).
- `packages/shared` – pazar yeri tablosu, tipler, kâr motoru.
- `packages/sp-api` – hafif SP-API istemcisi.

## Hızlı başlangıç

```bash
pnpm install
cp .env.example .env            # SP-API bilgilerini gir (bkz. docs/AMAZON_API_SETUP.md)
docker compose up -d            # PostgreSQL
pnpm db:migrate
pnpm dev:api                    # http://localhost:4000
pnpm dev:web                    # http://localhost:3000  (apps/web/.env.local -> API_URL, API_TOKEN)
pnpm build:extension            # chrome://extensions -> Load unpacked -> apps/extension/dist
```

Panelde bir mağaza oluştur (ör. "DE store", hedef: DE), ID'sini eklenti
ayarlarına yapıştır, amazon.it'te bir ürün aç, "Analyse for my store".

## Testler

```bash
pnpm --filter @sellereurope/shared test
```

## Dokümanlar

- [Amazon API kurulumu](docs/AMAZON_API_SETUP.md)
- [Mimari ve yol haritası](docs/ARCHITECTURE.md)
