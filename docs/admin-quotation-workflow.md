# Admin quotation workflow

Phase 16 membuat foundation workflow quotation internal.

1. Customer submit request quotation.
2. Sistem menyimpan quotation, quotation items, dan email log.
3. Sales membuka `/admin/quotations`.
4. Sales membuka detail `/admin/quotations/[id]`.
5. Sales review company, PIC, notes, size matrix, model 3D, logo placement, dan logo file id.
6. Sales dapat mark quotation menjadi `under_review`.
7. Harga final/internal notes penuh belum dikelola pada Phase 16.
8. Sales dapat mark `quoted` sebagai status foundation.
9. Customer approval flow masuk fase berikutnya.
10. Convert to order/WooCommerce sync penuh masuk fase berikutnya.

Phase 16 tidak mengirim email real dan tidak membuat WooCommerce order dari quotation.
