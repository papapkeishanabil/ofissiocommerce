# Storage and database readiness

Status saat ini:

- Data masih memory/mock untuk beberapa flow.
- Database production belum ada.
- Upload storage production belum ada.

## Rekomendasi storage

- Supabase Storage.
- S3-compatible storage.
- Cloudflare R2.

## Data yang butuh storage

- Logo customer.
- Artwork final.
- Invoice/quotation PDF.
- GLB model.
- Snapshot 3D.
- Dokumen pendukung order.

## Requirement storage

- Private bucket untuk file customer.
- Signed URL untuk akses terbatas.
- Max file size per tipe.
- MIME validation.
- Virus scan plan.
- SVG sanitize plan.
- Retention policy.

## Database yang dibutuhkan

- users.
- companies.
- company_users.
- products cache.
- carts.
- orders.
- payments.
- tracking.
- audit_logs.
- uploaded_files.

## Company isolation

Setiap query customer wajib scoped by company. Data company lain tidak boleh muncul lewat API, dashboard, tracking, Ofistant, atau repeat order.

## Backup requirement

- Daily, weekly, monthly retention.
- Restore test ke staging.
- Secret backup policy terpisah dari data backup.

## Migration plan nanti

1. Pilih database dan object storage.
2. Definisikan schema.
3. Migrasikan mock/in-memory store ke repository persistent.
4. Tambahkan row-level company isolation.
5. Tambahkan migration/seed staging.
6. Jalankan restore test.
