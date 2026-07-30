# PDF documents

Phase 22 menambahkan fondasi dokumen PDF resmi Ofissio untuk penawaran dan invoice.

## Jenis dokumen

- `quotation_pdf`: PDF penawaran resmi.
- `invoice_pdf`: PDF tagihan/invoice.
- `production_order_pdf_future`: placeholder untuk SPK produksi fase berikutnya.
- `packing_slip_pdf_future`: placeholder untuk packing slip fase berikutnya.

## Template registry

Template dikelola lewat registry server-side:

- `quotation_default`
- `invoice_default`
- `invoice_ofissio_custom`

Default staging:

```env
DEFAULT_QUOTATION_TEMPLATE=quotation_default
DEFAULT_INVOICE_TEMPLATE=invoice_ofissio_custom
```

## Storage

PDF disimpan ke private bucket Supabase Storage:

```text
ofissio-documents/{companyId}/documents/{yyyy}/{mm}/{documentType}/{documentNumber}-{randomId}.pdf
```

Metadata disimpan di table `documents`. Metadata file juga dapat dicatat di `uploaded_files` untuk audit storage internal.

## Download dan permission

- Customer hanya mendapat signed URL lewat endpoint company-scoped.
- Admin memakai endpoint internal guard.
- Response customer tidak mengirim `storageKey`, bucket internal, provider internals, atau service-role data.
- Signed URL dibuat server-side dan memiliki masa berlaku terbatas.

## Email integration

Email quotation ready memakai portal link `/quotes/[id]` sebagai default yang aman. Jika PDF sudah tersedia, email mencatat bahwa PDF bisa diunduh dari portal. Attachment PDF belum aktif di Phase 22.

## Migration

Jalankan manual di Supabase SQL Editor jika ingin mengaktifkan persistence live:

```text
database/migrations/007_documents_pdf.sql
```

`npm run check:documents` aman dijalankan sebelum migration diterapkan; hasilnya akan `SKIP` jika table/kolom dokumen belum tersedia.

## Known limitation

- Layout PDF belum pixel-perfect terhadap referensi desain.
- Attachment email belum aktif; default memakai portal link.
- QR iPaymu/payment link live belum aktif jika payment masih mock.
- E-signature dan faktur pajak resmi belum termasuk.
- Auth production masih mock sampai fase auth production final.
