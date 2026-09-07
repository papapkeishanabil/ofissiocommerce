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
| Payment iPaymu | Wajib jika ingin pembayaran real | `PAYMENT_PROVIDER`, `IPAYMU_ENABLED`, `IPAYMU_MODE`, `IPAYMU_VA`, `IPAYMU_API_KEY`, `IPAYMU_BASE_URL`, `IPAYMU_CALLBACK_URL`, `IPAYMU_RETURN_URL`, `IPAYMU_CANCEL_URL`, `IPAYMU_EXPIRE_MINUTES` |
| Email quotation | Default mock; wajib diisi jika quotation harus terkirim email real | `EMAIL_PROVIDER`, `EMAIL_ENABLED`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SALES_QUOTATION_EMAIL` |
| Generate 3D Meshy | Opsional, untuk AI 3D via Meshy | `MESHY_API_KEY` |
| Generate 3D Tripo | Opsional, untuk AI 3D via Tripo | `TRIPO_API_KEY` |
| Shipping | Saat ini mock/manual, belum butuh API key ekspedisi | `SHIPPING_PROVIDER`, `DEFAULT_ORIGIN_CITY`, `DEFAULT_ORIGIN_POSTAL_CODE` |
| Storage upload | Default mock; Supabase Storage nanti butuh env Supabase server-side | `STORAGE_PROVIDER`, bucket storage, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Ofistant AI | Opsional; HYBRID live dengan auto-fallback ke rule engine | `GEMINI_API_KEY`, `GEMINI_MODEL`, `OFISTANT_LLM_ENABLED` |
| WooCommerce | Wajib jika memakai catalog/order sync WooCommerce | `PRODUCT_SOURCE`, `WOOCOMMERCE_ENABLED`, `WOOCOMMERCE_BASE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`, `WOOCOMMERCE_SYNC_ORDERS` |
| WordPress Media | Wajib untuk upload foto produk dari Ofissio Admin | `WORDPRESS_MEDIA_USERNAME` + `WORDPRESS_MEDIA_APP_PASSWORD`, atau `WORDPRESS_MEDIA_TOKEN`; `WORDPRESS_MEDIA_BASE_URL` opsional |

## 1. Payment iPaymu

Isi ini jika ingin checkout membuat transaksi iPaymu real.

```env
PAYMENT_PROVIDER=ipaymu
IPAYMU_ENABLED=true
IPAYMU_MODE=sandbox
IPAYMU_VA=
IPAYMU_API_KEY=
IPAYMU_BASE_URL=https://sandbox.ipaymu.com
IPAYMU_CALLBACK_URL=
IPAYMU_RETURN_URL=
IPAYMU_CANCEL_URL=
IPAYMU_EXPIRE_MINUTES=1440
```

Catatan:

- Jika `PAYMENT_PROVIDER=mock`, transaksi tetap simulasi.
- Jangan pernah membuat `NEXT_PUBLIC_IPAYMU_API_KEY`.
- Return URL iPaymu bukan bukti paid. Status `paid` hanya dari callback valid/server verification.
- Jalankan `npm run check:payment` setelah mengubah env payment.

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
PRODUCT_IMAGE_MAX_MB=10
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

Ofistant kini HYBRID: bila `GEMINI_API_KEY` terisi, percakapan natural dipahami oleh Google Gemini (via Vercel AI SDK) dan memutuskan intent/action, sementara data faktual (harga, bordir, MOQ, stok, status order) dijaga oleh tool server-side agar tidak halusinasi. Endpoint: `POST /api/ofistant/chat` (anonim, rate limit 20 req/menit/IP).

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash-lite
OFISTANT_AI_PROVIDER=google
OFISTANT_LLM_ENABLED=true
```

Catatan:

- Tanpa `GEMINI_API_KEY` (atau bila LLM gagal), Ofistant otomatis fallback ke rule engine server-side yang diberi data katalog asli — tetap berfungsi, `source:"rules"` terlihat di response network.
- Kill-switch: `OFISTANT_LLM_ENABLED=false` memaksa rule engine walau key terisi.
- `GEMINI_API_KEY` hanya boleh dibaca server (tidak boleh ada varian `NEXT_PUBLIC_`).
- Semua model wajib melewati `ofistantModelResponseSchema` dan grounding gate yang sama. Model hanya menyusun bahasa; harga, tanggal, jumlah, nomor dokumen, status, dan tindakan tetap berasal dari rule engine, konteks halaman, atau Knowledge Base Published.
- Provider yang belum memiliki adapter tidak akan dijalankan. Sistem otomatis kembali ke rule engine, sehingga pergantian model/provider tidak boleh menurunkan akurasi fakta.
- Jalankan `npm run test:ofistant-consistency` setelah mengganti model atau menambah adapter provider.
- Harga/bordir hanya dihitung lewat tool (`compute_quantity_price`, `compute_embroidery_price`); model dilarang mengarang angka.
- Route bersifat anonim (pesan pertama pre-login); session opsional dan hanya memperkaya konteks (mis. `companyId` untuk cek status order).

## 8. WooCommerce

Isi jika ingin memakai WooCommerce sebagai product catalog source dan order backend headless.

```env
PRODUCT_SOURCE=woocommerce
WOOCOMMERCE_ENABLED=true
WOOCOMMERCE_BASE_URL=https://your-wordpress-site.com
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_SYNC_ORDERS=false
WORDPRESS_MEDIA_BASE_URL=
WORDPRESS_MEDIA_USERNAME=
WORDPRESS_MEDIA_APP_PASSWORD=
WORDPRESS_MEDIA_TOKEN=
```

Catatan:

- Jika `PRODUCT_SOURCE=mock`, Ofissio tetap memakai mock catalog.
- Jika WooCommerce env belum lengkap, sistem fallback aman ke mock.
- Set `WOOCOMMERCE_SYNC_ORDERS=true` hanya jika order sync sudah siap dites.
- Foto produk memakai WordPress Media Library, bukan bucket Supabase. User WordPress harus memiliki permission `upload_files`.
- Jangan membuat varian `NEXT_PUBLIC_` untuk credential WordPress Media.

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
