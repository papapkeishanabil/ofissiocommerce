# Admin quotation workflow

Phase 17 membuat workflow quotation internal yang lebih nyata untuk sales.

## Flow utama

1. Customer submit request quotation.
2. Sistem menyimpan quotation, quotation items, email log, dan audit log.
3. Sales membuka `/admin/quotations`.
4. Sales membuka detail `/admin/quotations/[id]`.
5. Sales review company, PIC, notes, size matrix, model 3D, logo placement, dan logo file id.
6. Sales mark quotation menjadi `under_review`.
7. Sales mengisi pricing per item, tax, shipping estimate, customer message, sales notes, dan valid until.
8. Backend menghitung subtotal dan grand total server-side.
9. Sales mark `quoted`.
10. Sales menjalankan `send_quote_to_customer` jika ingin mengirim/mencatat notifikasi.
11. Customer membuka `/quotes/[id]`.
12. Customer accept, reject, atau request revision.
13. Jika quotation accepted, admin convert quotation menjadi order Ofissio foundation.
14. Order hasil convert muncul di admin orders, customer dashboard, dan tracking.

## Batasan Phase 17

- PDF quotation belum dibuat.
- WooCommerce live order sync belum aktif.
- Payment tetap mock/foundation.
- Shipping tetap mock/manual.
- Admin auth masih mock/internal placeholder.
