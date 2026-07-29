# Quotation Management

Phase 17 memperkuat quotation B2B agar sales internal bisa meninjau request, mengisi harga final, mengirim penawaran, dan menunggu keputusan customer.

## Status quotation

- `draft`: draft internal/future use.
- `submitted`: request customer sudah masuk.
- `emailed`: status lama untuk kompatibilitas data Phase 13/14.
- `under_review`: sedang direview sales.
- `quoted`: harga final sudah siap untuk customer.
- `revision_requested`: customer meminta revisi.
- `accepted`: customer menyetujui quotation.
- `rejected`: customer menolak quotation.
- `expired`: masa berlaku habis.
- `converted_to_order`: quotation sudah menjadi order Ofissio.
- `cancelled`: dibatalkan internal.

## Admin review flow

1. Customer membuat request quotation.
2. Sales membuka `/admin/quotations/[id]`.
3. Sales cek company, PIC, size matrix, bordir/logo, dan model 3D.
4. Sales mark `under_review`.
5. Sales mengisi pricing per item.
6. Server menghitung subtotal, tax, shipping estimate, discount, dan grand total.
7. Sales mark `quoted`.
8. Sales bisa menjalankan action `send_quote_to_customer`.

Harga final tidak dibuat otomatis oleh frontend dan tidak diambil dari total yang dikirim browser.

## Pricing flow

Pricing disimpan di `quotation_json` agar quotation lama tetap stabil walaupun produk WooCommerce berubah. Migration 003 menyiapkan kolom fisik untuk reporting/indexing, tetapi aplikasi tetap kompatibel sebelum migration dijalankan.

## Customer accept/reject

Customer membuka `/quotes/[id]`.

- Jika status masih `submitted`/`under_review`, customer melihat pesan “sedang direview”.
- Jika status `quoted`, harga final dan CTA `Accept quotation` / `Reject` tampil.
- Jika quotation expired, accept ditolak backend.
- Internal notes dan sales notes tidak dikirim ke endpoint customer.

## Email notification

Action `send_quote_to_customer` memakai email foundation:

- `EMAIL_PROVIDER=mock` atau email disabled: tercatat sebagai mocked/skipped.
- Resend enabled: mencoba kirim email real.
- Email failure tidak membatalkan status quotation.

## Limitation

- PDF quotation final belum dibuat.
- Admin auth masih mock/internal placeholder.
- Email real bergantung env Resend.
- Harga final masih manual sales.
- WooCommerce live order sync masuk Phase 18.
