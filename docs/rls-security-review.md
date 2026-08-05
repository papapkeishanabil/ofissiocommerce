# Final RLS security review

Task F menetapkan batas keamanan final antara browser customer, API Ofissio,
Supabase, dan provider callback. Deployment SQL berada di
`database/migrations/020_rls_final_security_review.sql` dan harus diterapkan
manual setelah migration 001-019.

## Arsitektur akses

- Browser tidak pernah menerima `SUPABASE_SERVICE_ROLE_KEY`.
- Customer login memakai Supabase Auth, tetapi mutasi bisnis tetap melalui API
  Ofissio. API mengambil `companyId`, `userId`, dan role dari session terverifikasi.
- Customer tidak boleh menentukan company scope lewat body/header yang tidak
  dipercaya.
- Repository Supabase admin dan provider storage memakai service role hanya pada
  modul `server-only`, setelah auth/RBAC/company guard dijalankan.
- Admin UI tidak memberi otoritas. Setiap `/api/admin/*` tetap memeriksa internal
  session dan permission server-side.
- Callback iPaymu dan webhook Biteship tidak membutuhkan customer session, tetapi
  wajib lolos signature/shared-secret, reference, status, idempotency, dan validasi
  bisnis provider.

## Kebijakan RLS

Migration 020 mengaktifkan dan memaksa RLS untuk seluruh tabel customer,
operasional, event, dan internal. Read langsung yang masih diperbolehkan hanya:

- profil user sendiri dan membership aktif sendiri;
- company/address/user company yang sesuai membership aktif;
- cart milik user sendiri beserta item/size/customization;
- quotation/item, order/item, payment, tracking, company logo, shipping quote,
  dan carrier shipment milik company aktif.

Tidak ada direct browser write policy. Tabel berikut server-only karena memuat
storage key, internal notes, provider events, atau data operasional:

- `uploaded_files`, `documents`;
- `quotation_events`, `payment_events`, `shipment_events`, `shipping_events`;
- `shipments` legacy dan seluruh `process_order_*`;
- `email_logs`, `audit_logs`, `woo_sync_logs`, `admin_notifications`;
- `internal_user_profiles`.

Customer memperoleh data aman dari endpoint yang melakukan sanitization. Pola ini
mencegah storage key, bucket, internal notes, provider payload, dan audit metadata
terbaca lewat REST Supabase.

## Storage

Bucket `ofissio-logos`, `ofissio-artwork`, `ofissio-documents`, dan
`ofissio-3d-models` harus private. Migration 020 memaksa default bucket menjadi
private dan menghapus direct-object policy lama yang menyebut bucket tersebut.
Jika nama bucket di env berbeda, pastikan bucket custom juga private di dashboard.
`npm run check:storage` dan `npm run check:rls` memverifikasi bucket aktif.

Upload tetap divalidasi berdasarkan extension, MIME, ukuran, filename aman, dan
storage key yang dibuat server. Download/preview memakai signed URL singkat setelah
company scope diverifikasi.

## Menjalankan review

1. Review dan jalankan migration 020 di Supabase SQL Editor staging.
2. Jalankan:

```bash
npm run check:rls
npm run check:auth
npm run test:company-isolation
```

`check:rls` memeriksa kontrak migration, auth/admin guard, callback invalid,
secret scan, live RLS inventory, anonymous reads, direct write policy, dan status
private bucket. Script tidak membuat atau menghapus data customer.

## Manual security smoke

1. Login customer Company A dan buka quotation/order/file miliknya.
2. Ubah resource ID ke milik Company B; response wajib aman 403/404.
3. Coba signed URL file Company B; wajib ditolak.
4. Coba customer memanggil `/api/admin/orders`; wajib 403.
5. Coba internal role tanpa permission; wajib 403.
6. Coba `super_admin`; hanya permission yang terdaftar yang boleh berjalan.
7. Kirim callback payment dengan signature salah dan webhook shipping dengan
   secret salah; tidak boleh ada perubahan payment/order/shipment.
8. Pastikan `.next/static` tidak memuat service role, credential iPaymu,
   Biteship, SMTP, WordPress, atau WooCommerce secret.

## Rollback migration

Rollback hanya dilakukan jika migration 020 mengganggu staging dan harus melalui
SQL Editor/DBA, bukan dari aplikasi. Urutan aman:

1. Nonaktifkan traffic staging dan simpan hasil inventory policy saat ini.
2. Drop policy/helper Task F yang tercantum di migration 020.
3. Terapkan kembali policy migration 015, 007, 008, 009, dan 005 yang memang
   dibutuhkan sementara.
4. Jangan menjadikan bucket public sebagai cara rollback. Akses file tetap melalui
   signed URL server-side.
5. Jalankan `check:auth`, `test:company-isolation`, dan smoke customer/admin.

Rollback RLS ke kondisi tanpa proteksi tidak diperbolehkan. Jika sebuah API gagal,
lebih aman memperbaiki server guard/repository atau mengembalikan policy scoped
sebelumnya daripada mematikan RLS.

## Public link

Saat ini quotation, invoice, file, dan order customer tidak memakai bearer link
publik permanen. User harus login dan memiliki membership company aktif. Signed URL
storage bersifat sementara dan hanya diterbitkan setelah server memverifikasi
company scope. Jika public share link dibuat di masa depan, wajib memakai token
acak kuat, expiry, revoke, single-purpose scope, dan tidak boleh membawa internal
notes.

## Known limitations

- Migration 020 tidak dijalankan otomatis oleh aplikasi; staging/production DBA
  harus menerapkannya manual dan menyimpan bukti hasil `check:rls`.
- RLS melindungi REST database, tetapi service role memang bypass RLS. Karena itu
  server API guard, company filter repository, audit log, dan secret management
  tetap wajib.
- Antivirus dan sanitization SVG penuh belum aktif.
- Penetration test eksternal, CSP final, SIEM, rotation drill, dan incident
  response exercise masih menjadi production gap.
