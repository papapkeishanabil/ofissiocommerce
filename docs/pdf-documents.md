# PDF documents

Phase 22 menambahkan fondasi dokumen PDF resmi Ofissio untuk penawaran dan invoice.

## Jenis dokumen

- `quotation_pdf`: PDF penawaran resmi.
- `invoice_pdf`: PDF tagihan/invoice.
- `embroidery_work_order_pdf`: Bordir Work Order internal.
- `production_work_order_pdf`: Production Work Order (PWO) — gate brief approved.
- `design_approval_sheet_pdf`: Lembar Approval Desain (A4 landscape, 1 halaman per garment; figur foto, tabel spesifikasi/bordir/qty per gender, 3 blok tanda tangan digital + klausa).
- `production_order_pdf_future`: placeholder untuk SPK produksi fase berikutnya.
- `packing_slip_pdf_future`: placeholder untuk packing slip fase berikutnya.

## Template registry

Template dikelola lewat registry server-side:

- `quotation_default`
- `invoice_default`
- `invoice_ofissio_custom`
- `embroidery_work_order_ofissio`
- `production_work_order_ofissio`
- `design_approval_sheet_ofissio`

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

## Lembar Approval Desain (design approval sheet)

Dibuat lewat `POST /api/admin/quotations/[id]/generate-approval-sheet`, diunduh lewat `GET /api/admin/quotations/[id]/approval-sheet-pdf` (pola sama dengan PDF quotation).

- Hanya untuk quotation `source=custom_request` dengan `technicalSpecifications` terisi — termasuk brief customer portal yang sudah diperkaya sales.
- Nomor dokumen prefix `DAS` (`DAS-PRO-YYMM-NNN`), satu halaman A4 **landscape** per garment (`SimplePdfDocument({ orientation: "landscape" })`).
- **Figur foto** mockup depan/belakang di-resolve server-side dari `figureFront/BackFileId` (JPEG baseline atau PNG depth-8 non-interlaced). Format lain/progressive/interlaced otomatis fallback ke placeholder vektor — generate tidak pernah gagal karena file figur.
- **Idempoten per fingerprint** `templateId::rendererVersion::revisionNo::activeSignatureCount::figureFileIds` — tersimpan di `documents.metadata.sheetFingerprint`. Revisi baru, tanda tangan baru, atau ganti figur memicu regenerate otomatis; admin juga bisa force regenerate.
- Renderer version `das-ofissio-v1` (`DESIGN_APPROVAL_SHEET_RENDERER_VERSION`).
- Engine PDF (`SimplePdfDocument.image()`) mendukung embed JPEG (DCTDecode langsung) dan PNG (FlateDecode; alpha jadi SMask). Semua template portrait lama tidak berubah.

## Migration

Jalankan manual di Supabase SQL Editor jika ingin mengaktifkan persistence live:

```text
database/migrations/007_documents_pdf.sql
database/migrations/034_design_approval_sheet.sql   # nilai CHECK documents baru + max punggung 30 cm
```

`npm run check:documents` aman dijalankan sebelum migration diterapkan; hasilnya akan `SKIP` jika table/kolom dokumen belum tersedia.

## Known limitation

- Layout PDF belum pixel-perfect terhadap referensi desain.
- Attachment email belum aktif; default memakai portal link.
- QR iPaymu/payment link live belum aktif jika payment masih mock.
- E-signature gambar (signature pad) dan faktur pajak resmi belum termasuk; Lembar Approval Desain memakai tanda tangan klik + identitas (nama/jabatan) yang tercatat di portal.
- Auth production masih mock sampai fase auth production final.
