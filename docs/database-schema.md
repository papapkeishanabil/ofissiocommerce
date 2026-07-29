# Database schema foundation

Phase 14 memperbarui draft schema Postgres/Supabase di `database/schema.sql`, migration pointer di `database/migrations/`, dan seed development di `database/seed-dev.sql`.

## Tujuan schema

- Menjadi dasar persistent data untuk company, users, roles, carts, orders, payments, shipments, tracking, uploaded files, company logos, quotations, email logs, dan audit logs.
- Menyiapkan migrasi bertahap dari memory/mock repository.
- Menjaga company isolation lewat `company_id` pada data customer-scoped.

## Tabel utama

- `companies`
- `user_profiles`
- `company_users`
- `company_addresses`
- `carts`
- `cart_items`
- `cart_item_size_matrix`
- `cart_item_customizations`
- `orders`
- `order_items`
- `payments`
- `shipments`
- `tracking_records`
- `company_logos`
- `uploaded_files`
- `quotations`
- `quotation_items`
- `email_logs`
- `audit_logs`

`uploaded_files` Phase 12 menyimpan metadata storage: `file_type`, `safe_filename`, `storage_bucket`, `storage_key`, `mime_type`, `extension`, `size_bytes`, `status`, `public_url`, `signed_url_expires_at`, dan `metadata_json`.

Phase 14 menambahkan `quotation_json`, `email_results_json`, `order_json`, `payment_json`, dan `tracking_json` sebagai snapshot transisi agar repository bisa persistent tanpa refactor besar ke semua domain table sekaligus.

## Index penting

Schema draft menambahkan index untuk:

- `company_id`
- `user_id`
- `order_id`
- `payments.reference_id`
- `orders.order_number`
- `created_at`
- `uploaded_files(company_id, file_type, status, created_at)`
- `company_logos(company_id, created_at)`

## RLS policy plan

RLS belum diaktifkan otomatis pada Phase 11. Plan:

- Semua data customer-scoped wajib filter `company_id`.
- Customer hanya bisa akses company sendiri.
- Internal role hanya bisa akses sesuai permission.
- Service role hanya digunakan server-side.
- Request body frontend tidak boleh menjadi sumber otoritatif `company_id`.
- File customer harus private dan diakses melalui API server-side/signed URL setelah company scope tervalidasi.

## Migration plan

1. Review schema di staging.
2. Jalankan `schema.sql`.
3. Jalankan `seed-dev.sql`.
4. Tambahkan RLS policy setelah claim/session company final.
5. Migrasikan repository per fitur: cart, order, payment, tracking, audit, upload.
6. Jalankan backup/restore test.
