# Amazon SP-API Kurulum Rehberi (Avrupa)

SellerEurope, Amazon **Selling Partner API (SP-API)** kullanır. Avrupa'daki tüm
pazar yerleri (DE, FR, IT, ES, NL, SE, PL, BE, IE, UK) **tek bir EU bölge
endpoint'inden** (`https://sellingpartnerapi-eu.amazon.com`) ve **tek bir
"Europe unified" satıcı hesabından** yönetilir. Yani bir kez yetki alırsın,
tüm Avrupa mağazalarında çalışır.

## 1. Ön koşullar

1. **Profesyonel satıcı hesabı** (aylık ~39 €). Bireysel hesaplarla SP-API'ye
   erişilemez.
2. Hesap, **Europe unified account** olmalı (Seller Central Europe'da varsayılan
   olarak öyle gelir; Almanya'dan açtıysan IT/FR/ES vs. otomatik dahildir).
3. Seller Central'da kimlik doğrulaması tamamlanmış olmalı.

## 2. Developer kaydı (Solution Provider Portal)

Amazon, geliştirici kaydını Seller Central'dan **Solution Provider Portal**'a
(SPP) taşıdı. Seller Central → Apps & Services → Develop Apps tıklayınca
otomatik olarak SPP'ye yönlendirilirsin; bu normaldir.

1. Seller Central'a **hesap sahibi (primary user)** e-postasıyla giriş yap.
   İkincil kullanıcıyla girersen SPP "Keine Konten gefunden / No accounts
   found" der. Aynı e-postayı SPP de kullanır.
2. Seller Central → **Apps & Services → Develop Apps** → yönlendirmeyi bekle.
   Doğrudan link: https://solutionprovider.amazon.com
3. "Für das neue Programm registrieren" sayfasında satıcı hesabın (ör. Ankashop)
   listelenir → seç → **Konto auswählen**. Listede yoksa "Verwenden Sie andere
   Anmeldeinformationen" ile satıcı hesabının sahibi olan e-postayla tekrar gir.
   **Konto erstellen'e basma**, gereksiz ikinci hesap açılır.
4. Developer profili formu:
   - Developer type: **Private developer** (sadece kendi hesabın için).
   - Kullanacağın veri türleri: *Product Listing, Pricing, Inventory & Order Tracking*.
   - "Do you access PII?" → ilk aşamada **No**. Sipariş adresleri gerekince
     profili güncelleyip *Direct-to-Consumer Shipping* rolü eklersin.
5. Onay genelde saatler–birkaç gün içinde gelir.

> Hesap sağlığı "At risk" görünüyorsa önce onu düzelt. Amazon riskli
> hesaplarda developer onayını bekletebilir ve SP-API ile açılan listelemeler
> hesabı daha da zorlar.

## 3. Uygulama (app) oluştur ve LWA kimlik bilgilerini al

1. SPP → **Apps** menüsü → **Add new app client** (Neuen App-Client hinzufügen).
2. App name: `sellereurope`, API type: **SP API**.
3. Roles (izinler) — şunları işaretle:
   - **Product Listing** (Listings Items, Catalog, Product Type Definitions)
   - **Pricing** (Product Pricing, Product Fees)
   - **Inventory and Order Tracking** (Orders)
   - (İleride) **Direct-to-Consumer Shipping** → sipariş adresleri için (PII).
4. Kaydet → **LWA credentials** → "View" ile:
   - `Client ID` → `SP_API_CLIENT_ID`
   - `Client Secret` → `SP_API_CLIENT_SECRET` (180 günde bir yenilenmesi gerekir; Amazon e-posta atar)

## 4. Refresh token al (self-authorization)

Kendi hesabın için uygulamayı **self-authorize** edersin, OAuth akışına gerek yok:

1. SPP → Apps sayfasında uygulamanın yanındaki **Authorize** butonuna bas.
2. Ekranda çıkan **Refresh Token**'ı kopyala → `SP_API_REFRESH_TOKEN`.
   Bu token uzun ömürlüdür (iptal etmediğin sürece geçerli).

> Not: Ekim 2023'ten beri SP-API için **AWS IAM / SigV4 imzası gerekmiyor**.
> Sadece LWA client id + secret + refresh token yeterli. Bu yüzden `.env`'de AWS
> anahtarı yok.

## 5. Seller ID

Seller Central → **Settings → Account Info → Your Merchant Token** →
`SP_API_SELLER_ID`.

## 6. `.env` doldur ve test et

```bash
cp .env.example .env   # değerleri gir
pnpm install
docker compose up -d   # postgres
pnpm db:migrate
pnpm dev:api
curl -H "Authorization: Bearer change-me" http://localhost:4000/marketplaces
```

Gerçek bir ASIN ile deneme:

```bash
curl -X POST http://localhost:4000/stores -H "Authorization: Bearer change-me" \
  -H "content-type: application/json" \
  -d '{"name":"DE store","targetMarketplace":"DE"}'
```

## 7. Kullanılan API'ler ve rate limit'ler

| API | Ne için | Rate limit (yaklaşık) |
|---|---|---|
| Catalog Items v2022-04-01 | ASIN hedef pazarda var mı, rank, görsel | 2 req/s |
| Product Pricing v0 `getItemOffers` | Buy box / en düşük fiyat, Amazon satıyor mu | 0.5 req/s |
| Product Fees v0 | Referral fee tahmini | 1 req/s |
| Listings Restrictions | Gated / marka kısıtı var mı | 5 req/s |
| Listings Items v2021-08-01 | Teklif oluştur / fiyat-stok güncelle / sil | 5 req/s |
| Orders v0 | Hedef mağazadan siparişleri çek | 0.0167 req/s (burst 20) |
| Notifications (ileride) | Fiyat değişimi / sipariş bildirimleri | — |

Fiyat verisini toplu almak için `getItemOffersBatch` (20 ASIN/istek) veya
**Reports API** (`GET_MERCHANT_LISTINGS_ALL_DATA`) kullanılabilir; ilk sürümde
tek tek çağrı yeterlidir.

## 8. Alternatif: Product Advertising API (PA-API)

Kaynak ürün verisini (amazon.it fiyatı vs.) resmi yoldan çekmek için PA-API
gerekir, ancak **Amazon Associates** hesabı + 180 gün içinde 3 satış şartı var.
Bu yüzden SellerEurope, kaynak tarafı **tarayıcı eklentisiyle sayfadan okuyor**;
hedef tarafı ise SP-API'den alıyor. PA-API onayı alırsan `packages/` altına bir
kaynak sağlayıcı eklemek kolaydır.

## 9. Sipariş akışı ve dikkat edilmesi gerekenler

SellerEurope **kendi depo** modeliyle çalışır: sipariş hedef mağazaya düşer,
ürünü kaynak pazardan **kendi deponuza** alırsınız, yeniden paketleyip **kendi
etiketinizle** gerçek alıcıya gönderirsiniz. Böylece:

- **Seller of record** sizsiniz, pakette başka perakendecinin fişi olmaz →
  Amazon'un dropshipping politikasına uyumludur.
- `confirmShipment` ile kendi kargo firmanız + takip numaranız Amazon'a
  bildirilir (`POST /orders/:id/ship`).
- Handling time gerçekçi olmalı: kaynak teslimat (1–3 gün) + depo işlem + çıkış
  kargosu. Varsayılan **5 gün**; geç gönderim oranı %4'ü aşarsa hesap
  sağlığı etkilenir.

PII (alıcı adresi) için developer profilinde **Direct-to-Consumer Shipping**
rolünü ve PII erişimini açmanız gerekir; aksi halde Orders API adres
alanlarını boş döndürür. Bu rol için Amazon veri güvenliği anketi ister
(şifreleme, erişim logu, 30 gün sonra silme). Küçük ölçek için kabul edilebilir
cevaplar: veriler şifreli PostgreSQL'de, sadece sipariş süresince, tek kullanıcı.

**KDV (OSS)**: AB içi B2C uzaktan satışlarda 10.000 € eşiğini geçince hedef
ülkenin KDV'si uygulanır; **OSS** kaydı yaptırın. `Store.vatRegistered` ayarı
kâr hesabında girdi KDV'sini mahsup eder.

**Kâr hesabında kargo**: kaynaktan depoya kargo genelde Prime ile ücretsizdir
(`sourceShipping`), depodan müşteriye kargo (`outboundShipping`, ör. DE içi
DHL Paket ~5,5 €) mağaza ayarından girilir ve her analizde düşülür.
