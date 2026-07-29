# Process Order Foundation

Phase 19 menambahkan dokumen kerja internal dari Sales Order / Commerce Order yang sudah masuk. Tujuannya mengurangi input ulang dari WooCommerce atau Ofissio checkout ke operasional Harmas.

## Konsep

- Sales Order / Commerce Order tetap menjadi sumber transaksi, customer, harga, payment, dan ringkasan order.
- Process Order adalah dokumen kerja internal yang dibuat dari order tersebut.
- Satu Sales Order hanya boleh punya satu Process Order aktif. Pembuatan bersifat idempotent.

## Route

- `fulfillment`: produk standar tanpa custom.
- `customization`: produk standar dengan logo, bordir, sablon, DTF, atau nama.
- `production`: custom design, model khusus, bahan khusus, atau kebutuhan SPK produksi.

## Persistence

Migration tersedia di [005_process_orders.sql](../database/migrations/005_process_orders.sql).

Migration ini tidak dijalankan otomatis oleh Codex. Jalankan manual via Supabase SQL Editor sebelum memakai persistence process order di staging/live.

## Tracking

Customer tidak melihat istilah internal seperti replenishment atau detail task produksi. Tracking customer memakai label sederhana seperti:

- Order sedang diproses
- Pesanan masuk proses custom
- Pesanan masuk persiapan produksi
- Pesanan sedang dikemas
- Pesanan siap dikirim

## Limitation Phase 19

- Belum ada kapasitas mesin.
- Belum ada scheduling PPIC penuh.
- Belum ada PDF SPK.
- Assignment operator/team masih foundation.
- Replenishment masih status internal, belum inventory real.
