# Ofissio API Keys & Environment Checklist

Dokumen ini berisi daftar konfigurasi `.env.local` yang perlu diisi agar fitur Ofissio berjalan real, bukan mode mock.

Jangan commit `.env.local` ke Git. Semua API key/secret harus tetap server-side dan tidak boleh memakai prefix `NEXT_PUBLIC_`.

## Cara pakai

1. Copy `.env.example` menjadi `.env.local`.
2. Isi key sesuai provider yang ingin diaktifkan.
3. Restart server setelah mengubah `.env.local`.

```powershell
npm run dev
```

## Ringkasan wajib/opsional

| Area fitur | Status saat ini | Env yang perlu diisi |
| --- | --- | --- |
| Payment iPaymu | Wajib jika ingin pembayaran real | `PAYMENT_PROVIDER`, `IPAYMU_VA`, `IPAYMU_API_KEY`, `IPAYMU_BASE_URL`, `IPAYMU_CALLBACK_URL`, `IPAYMU_RETURN_URL`, `IPAYMU_CANCEL_URL` |
| Email quotation | Default mock; wajib diisi jika quotation harus terkirim email real | `EMAIL_PROVIDER`, `EMAIL_ENABLED`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SALES_QUOTATION_EMAIL` |
| Generate 3D Meshy | Opsional, untuk AI 3D via Meshy | `MESHY_API_KEY` |
| Generate 3D Tripo | Opsional, untuk AI 3D via Tripo | `TRIPO_API_KEY` |
| Shipping | Saat ini mock/manual, belum butuh API key ekspedisi | `SHIPPING_PROVIDER`, `DEFAULT_ORIGIN_CITY`, `DEFAULT_ORIGIN_POSTAL_CODE` |
| Storage upload | Default mock; Supabase Storage nanti butuh env Supabase server-side | `STORAGE_PROVIDER`, bucket storage, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Ofistant AI | Opsional/future real LLM | `OFISTANT_LLM_API_KEY`, `OFISTANT_LLM_MODEL` |
| WooCommerce | Wajib jika memakai catalog/order sync WooCommerce | `PRODUCT_SOURCE`, `WOOCOMMERCE_ENABLED`, `WOOCOMMERCE_BASE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`, `WOOCOMMERCE_SYNC_ORDERS` |

## 1. Payment iPaymu

Isi ini jika ingin checkout membuat transaksi iPaymu real.

```env
PAYMENT_PROVIDER=ipaymu
IPAYMU_VA=
IPAYMU_API_KEY=
IPAYMU_BASE_URL=
IPAYMU_CALLBACK_URL=
IPAYMU_RETURN_URL=
IPAYMU_CANCEL_URL=
```

Catatan:

- Jika `PAYMENT_PROVIDER=mock`, transaksi tetap simulasi.
- Jangan pernah membuat `NEXT_PUBLIC_IPAYMU_API_KEY`.

## 2. Email quotation

Isi ini agar request quotation benar-benar terkirim ke email customer/PIC dan sales.

```env
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@your-domain.com>"
EMAIL_REPLY_TO=sales@your-domain.com
SALES_QUOTATION_EMAIL=sales@your-domain.com
```

Catatan:

- Jika `EMAIL_PROVIDER=mock`, quotation hanya tercatat, email real tidak dikirim.
- Jika `EMAIL_ENABLED=false`, provider real tidak akan mengirim email.
- `EMAIL_FROM` harus memakai domain email yang sudah diverifikasi di provider email.
- Saat ini provider yang disiapkan di kode adalah Resend.
- Jalankan `npm run check:email` setelah mengubah env.
- Real staging send hanya dilakukan jika menjalankan `EMAIL_TEST_SEND=true npm run check:email`.
- Jangan membuat `NEXT_PUBLIC_RESEND_API_KEY`.
- Untuk rollback aman, set `EMAIL_PROVIDER=mock` dan `EMAIL_ENABLED=false`.

## 3. Generate 3D Meshy

Isi jika ingin fitur generate GLB dari foto produk memakai Meshy.ai.

```env
MESHY_API_KEY=
```

Catatan:

- Tanpa key ini, fitur Meshy akan fallback ke mock/fallback internal.
- Key ini hanya boleh dibaca server.

## 4. Generate 3D Tripo

Isi jika ingin fitur generate GLB dari foto produk memakai Tripo3D.

```env
TRIPO_API_KEY=
```

Catatan:

- Tanpa key ini, fitur Tripo akan menampilkan pesan bahwa `TRIPO_API_KEY` belum dikonfigurasi.
- Key ini juga hanya boleh server-side.

## 5. Shipping

Untuk fase sekarang belum ada API key ekspedisi real. Shipping masih memakai provider mock/manual.

```env
SHIPPING_PROVIDER=mock
DEFAULT_ORIGIN_CITY=Bandung
DEFAULT_ORIGIN_POSTAL_CODE=40115
```

Jika nanti memakai provider ekspedisi real, tambahkan key khusus provider tersebut di fase integrasi shipping berikutnya.

## 6. Storage upload

Default development tetap mock:

```env
STORAGE_PROVIDER=mock
STORAGE_BUCKET_LOGOS=ofissio-logos
STORAGE_BUCKET_ARTWORK=ofissio-artwork
STORAGE_BUCKET_DOCUMENTS=ofissio-documents
STORAGE_BUCKET_3D=ofissio-3d-models
STORAGE_SIGNED_URL_EXPIRES_SECONDS=3600
MAX_LOGO_UPLOAD_MB=10
MAX_DOCUMENT_UPLOAD_MB=20
MAX_GLB_UPLOAD_MB=100
```

Jika nanti memakai Supabase Storage:

```env
STORAGE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Catatan:

- `SUPABASE_SERVICE_ROLE_KEY` hanya server-side.
- Jangan pernah membuat `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
- Bucket file customer production sebaiknya private dan diakses lewat signed URL.

## 7. Ofistant AI

Disiapkan untuk mode LLM real nanti.

```env
OFISTANT_LLM_API_KEY=
OFISTANT_LLM_MODEL=
```

Saat ini Ofistant masih dapat berjalan dengan rule/mock yang ada.

## 8. WooCommerce

Isi jika ingin memakai WooCommerce sebagai product catalog source dan order backend headless.

```env
PRODUCT_SOURCE=woocommerce
WOOCOMMERCE_ENABLED=true
WOOCOMMERCE_BASE_URL=https://your-wordpress-site.com
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_SYNC_ORDERS=false
```

Catatan:

- Jika `PRODUCT_SOURCE=mock`, Ofissio tetap memakai mock catalog.
- Jika WooCommerce env belum lengkap, sistem fallback aman ke mock.
- Set `WOOCOMMERCE_SYNC_ORDERS=true` hanya jika order sync sudah siap dites.

## Contoh `.env.local` minimum untuk fitur real penting

Jika prioritas saat ini adalah payment real dan quotation email real:

```env
PAYMENT_PROVIDER=ipaymu
IPAYMU_VA=
IPAYMU_API_KEY=
IPAYMU_BASE_URL=
IPAYMU_CALLBACK_URL=
IPAYMU_RETURN_URL=
IPAYMU_CANCEL_URL=

EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@your-domain.com>"
EMAIL_REPLY_TO=sales@your-domain.com
SALES_QUOTATION_EMAIL=sales@your-domain.com

SHIPPING_PROVIDER=mock
DEFAULT_ORIGIN_CITY=Bandung
DEFAULT_ORIGIN_POSTAL_CODE=40115
```

## Checklist setelah mengisi API key

- Restart server.
- Test request quotation dan pastikan status email bukan `mock`.
- Test checkout dan pastikan payment URL/token dari iPaymu terbentuk.
- Cek console terminal untuk error provider.
- Pastikan `.env.local` tetap masuk `.gitignore`.
