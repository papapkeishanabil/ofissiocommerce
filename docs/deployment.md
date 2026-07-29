# Deployment readiness

Phase 9 belum melakukan deploy production. Dokumen ini menyiapkan langkah staging/production agar Ofissio bisa dipindahkan dengan risiko yang lebih terukur.

## Local setup

```bash
npm install
npm run dev
```

Dev server berjalan di `http://localhost:8000`.

## Build verification

```bash
npm run typecheck
npm run lint
npm run build
```

Start production build lokal:

```bash
npm run start
```

## Node version

Gunakan Node 22 LTS atau versi yang kompatibel dengan Next.js 15.5.4.

## Environment setup

1. Gunakan `.env.example` sebagai daftar key.
2. Simpan secret di hosting secret manager.
3. Jalankan:

```bash
node --experimental-strip-types scripts/check-env.ts
```

Jangan commit `.env`, `.env.local`, atau `.env.production`.

## Domain dan HTTPS

- Production wajib memakai HTTPS.
- `APP_URL` harus sesuai domain public.
- iPaymu callback/return/cancel URL harus memakai HTTPS.
- Pastikan CSP memperbolehkan domain GLB/CDN yang dipakai.

## WooCommerce setup

Env:

```bash
PRODUCT_SOURCE=woocommerce
WOOCOMMERCE_ENABLED=true
WOOCOMMERCE_BASE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_SYNC_ORDERS=false
```

Product fields wajib:

- SKU.
- Published status.
- Harga/MOQ.
- Warna dan size.
- Metadata `model_3d_url`, `model_3d_id`, `model_3d_version`.
- URL GLB valid.

Produk tanpa GLB valid tidak boleh tampil di katalog dan tidak boleh masuk cart.

## Payment iPaymu plan

Saat ini `PAYMENT_PROVIDER=mock` adalah default aman. `PAYMENT_PROVIDER=ipaymu` masih fail-closed sampai:

- endpoint resmi merchant final;
- request signature final;
- callback signature final;
- contract test sandbox pass;
- callback URL didaftarkan di dashboard iPaymu.

Jangan mengaktifkan live payment sebelum semua poin ini selesai.

## Shipping provider plan

Saat ini `SHIPPING_PROVIDER=mock` atau `manual`. Provider real baru boleh aktif setelah:

- credential sandbox tersedia;
- request/response schema final;
- error handling tidak membocorkan payload provider;
- cache rate diuji;
- tracking provider diuji.

## Email / Resend

Env:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
SALES_QUOTATION_EMAIL=
```

Production membutuhkan domain sender verified di Resend. Jika mailbox `quotation@ofissio.com` belum dibuat, siapkan forwarding agar reply customer masuk ke sales.

## GLB hosting dan CSP

KK-006 saat ini memakai `/3d/kk-006.glb`. Untuk production dengan object storage/CDN:

- pastikan `Content-Type` GLB benar;
- jangan blokir file `.glb` di CDN;
- tambahkan domain CDN ke `connect-src` jika file dimuat cross-origin;
- pertimbangkan signed URL untuk model/private artwork.

## Google Fonts/build network issue

Phase 9 mengganti `next/font/google` menjadi system font stack. Build production tidak lagi bergantung download Google Fonts dari network eksternal.

## Rollback plan

1. Simpan tag atau commit SHA release terakhir.
2. Jika deploy gagal, rollback ke versi stabil sebelumnya.
3. Jalankan smoke test ulang setelah rollback.
4. Cek order/payment/tracking yang dibuat selama window incident.

## Smoke test setelah deploy

- `/catalog` 200.
- Detail KK-006 200.
- `/3d/kk-006.glb` 200.
- Preview 3D canvas muncul.
- Add to cart.
- Checkout.
- Shipping mock/manual.
- Payment mock success.
- Dashboard.
- `/orders/[id]`.
- Ofistant tracking.
- Mobile responsive.
