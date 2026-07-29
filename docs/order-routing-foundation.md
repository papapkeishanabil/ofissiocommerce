# Order Routing Foundation

Phase 18 memperjelas pemisahan operasional:

- WooCommerce tetap menjadi sumber Sales Order / Commerce Order.
- Ofissio Admin menjadi workbench untuk menentukan proses order.
- Tidak semua order WooCommerce/Ofissio otomatis menjadi Production Order.

## Prinsip stok produk standar

Untuk customer UI, produk standar tidak memakai konsep `out of stock` / `stok habis`.

- Produk standar tetap bisa dipesan.
- Jika stok fisik internal kurang, itu menjadi replenishment internal.
- Admin melihat warning `Replenishment needed`.
- Customer tidak melihat status unavailable karena stok standar.

## Process route

Field foundation:

| Field | Value |
| --- | --- |
| `process_route` | `fulfillment`, `customization`, `production` |
| `process_status` | `not_started`, `ready_to_process`, `in_progress`, `waiting_replenishment`, `waiting_customer_approval`, `on_hold`, `completed`, `cancelled` |
| `replenishment_status` | `not_required`, `needed`, `in_progress`, `completed` |
| `has_customization` | boolean |
| `customization_type` | `embroidery`, `screen_printing`, `dtf`, `name_tag`, `custom_design`, `none` |

## Routing rule

- Standard product tanpa custom → `fulfillment`.
- Standard product dengan logo/bordir/sablon/nama/custom ringan → `customization`.
- Custom design/model khusus/bahan khusus/desain khusus → `production`.

## Admin button

Admin order detail memakai tombol sesuai route:

- `fulfillment`: “Buat Fulfillment Order”
- `customization`: “Buat Customization Order”
- `production`: “Buat Production Order”

Button Phase 18 awalnya hanya mengubah `process_status` ke `in_progress`. Mulai Phase 19, button tersebut membuat Process Order idempotent sesuai route.

## Flow foundation

Fulfillment:

1. Picking
2. Packing
3. Shipping

Customization:

1. Ambil produk standar
2. Bordir/sablon/nama
3. QC custom
4. Packing

Production:

1. Approval desain
2. Bahan
3. Cutting
4. Sewing
5. Bordir/sablon
6. Finishing
7. QC
8. Packing

## Phase 19 continuation

Phase 19 menambahkan Process Order sebagai dokumen kerja internal:

- `fulfillment` membuat Fulfillment Order.
- `customization` membuat Customization Order.
- `production` membuat Production Order / SPK foundation.

Endpoint `POST /api/admin/orders/[id]/process` sekarang idempotent. Jika process order sudah ada, endpoint mengembalikan record existing dan tidak membuat duplikat.
