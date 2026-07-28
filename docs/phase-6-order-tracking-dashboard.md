# Phase 6 - Order Tracking dan Customer Dashboard

Phase 6 menambahkan dashboard customer, order tracking, progress otomatis, mock quotation tracking, integrasi Ofistant, dan repeat order basic.

## Fulfillment type

- `READY_STOCK`: tracking pemrosesan order sampai pengiriman.
- `READY_STOCK_WITH_CUSTOMIZATION`: stok disiapkan, custom ringan, QC custom, lalu pengiriman.
- `MADE_TO_ORDER`: approval desain, produksi lengkap, QC, packing, dan pengiriman.
- `QUOTATION_ONLY`: quotation submitted sampai paid, lalu dapat dikonversi ke order di fase berikutnya.

## Progress otomatis

Progress dihitung oleh `calculateOrderProgress()` dari bobot stage dan progress stage berjalan.

Contoh `MADE_TO_ORDER`:

- Approval desain selesai: 10%
- Persiapan produksi selesai: 10%
- Cutting selesai: 15%
- Sewing berjalan 40 dari 100 pcs: 30% x 40% = 12%

Total progress: 10 + 10 + 15 + 12 = 47%.

Customer-facing status dipetakan lewat `mapInternalStatusToCustomerStatus()` dari fulfillment type, current stage, dan payment status.

## Mock data

Data mock tersedia untuk:

- `OF-ORD-RS-001`: `READY_STOCK`, sedang dalam pengiriman.
- `OF-ORD-MTO-001`: `MADE_TO_ORDER`, sedang sewing 40 dari 100 pcs.
- `OF-ORD-CUS-001`: `READY_STOCK_WITH_CUSTOMIZATION`, sedang bordir/sablon.
- `OF-ORD-HIS-001`: order history selesai.
- `OF-QUO-001`: quotation submitted.

Semua item mock memakai produk KK-006 yang tetap published dan punya GLB, supaya repeat order tetap lolos guard Phase 4C.

## Ofistant

Intent tracking seperti "Pesanan saya sudah sampai mana?" membaca data tracking mock/real yang tersedia. Jika ada order, Ofistant mengirim action:

```json
{
  "type": "OPEN_ORDER_TRACKING",
  "payload": {
    "order_id": "ord-mto-001"
  }
}
```

Dispatcher membuka `/orders/{order_id}`. Ofistant tidak mengubah progress sendiri.

## Repeat order basic

Tombol `Pesan Ulang` menyalin:

- product
- selected color
- size matrix
- embroidery placements
- logo filename/placeholder lewat konfigurasi 3D
- notes

Item masuk ke cart client yang sudah ada, lalu customer dapat mengedit qty sebelum checkout ulang.

## Known limitation

- Data tracking masih mock/client-side readiness, belum multi-user database.
- Admin update progress belum dibuat; role updater baru tersedia sebagai tipe dan metadata timeline.
- Dokumen order, invoice, artwork approval, upload PO, dan contact sales masih placeholder.
- Payment Phase 5 order server-memory belum dipersist ke dashboard setelah restart.
- WooCommerce belum diimplementasikan sesuai batasan fase.
