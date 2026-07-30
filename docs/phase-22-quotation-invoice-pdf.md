# Phase 22: Quotation & Invoice PDF

Phase 22 menambahkan fondasi PDF resmi untuk quotation dan invoice Ofissio.

## Scope

- Quotation PDF generation.
- Invoice PDF generation.
- Template registry: `quotation_default`, `invoice_default`, `invoice_ofissio_custom`.
- Storage PDF ke private bucket `ofissio-documents`.
- Metadata dokumen ke table `documents`.
- Admin generate/download PDF.
- Customer download PDF lewat signed URL company-scoped.
- Email quotation ready menampilkan fondasi link PDF/portal.

## Bukan scope

- iPaymu live.
- Shipping provider real.
- WooCommerce live.
- Auth production final.
- Faktur pajak resmi.
- E-signature legal final.
- PDF template editor.
- Production deployment.

## Migration manual

Migration dibuat di:

```text
database/migrations/007_documents_pdf.sql
```

Jangan apply otomatis dari script. Jalankan manual di Supabase SQL Editor saat staging siap.

## API endpoint

- `POST /api/admin/quotations/[id]/generate-pdf`
- `GET /api/admin/quotations/[id]/pdf`
- `GET /api/quotations/[id]/pdf`
- `POST /api/admin/orders/[id]/generate-invoice`
- `GET /api/admin/orders/[id]/invoice`
- `GET /api/orders/[id]/invoice`

Generate endpoint hanya untuk internal admin. Customer endpoint hanya membuat signed download URL untuk dokumen milik company yang sama.

## Validasi

```bash
npm run check:env
npm run check:supabase
npm run check:storage
npm run check:woocommerce
npm run check:email
npm run check:documents
npm run typecheck
npm run lint
npm run build
npm run check:all
npm run verify:supabase-persistence
npm run test:company-isolation
```

## Known limitation

- Jika migration 007 belum diterapkan, endpoint generate PDF akan gagal aman dan `check:documents` akan memberi status skipped.
- Template invoice mendekati referensi, belum pixel-perfect.
- Email mengarah ke portal link; attachment PDF belum aktif.
- Payment link/QR live menunggu iPaymu live.
