# Ofissio Admin

Ofissio Admin adalah workspace internal untuk operasional B2B Ofissio. Ini bukan pengganti WP Admin atau WooCommerce Admin.

## Pembagian interface

WP Admin / WooCommerce tetap menjadi tempat utama untuk:

- Product catalog.
- SKU.
- Harga dasar.
- Foto produk.
- Kategori.
- WooCommerce Orders dasar.

Ofissio Admin dipakai untuk:

- Request quotation.
- Detail quotation B2B.
- Size matrix.
- Logo bordir dan placement.
- Konfigurasi 3D yang dikirim customer.
- File upload customer.
- Read-only upload/logos visibility untuk internal admin.
- Company/customer operational data.
- Operational order detail.
- WooCommerce staging sync visibility/retry.
- Process routing: fulfillment/customization/production.
- Tracking produksi.
- Audit/activity view foundation.

## Route admin

- `/admin`
- `/admin/quotations`
- `/admin/quotations/[id]`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/process-orders`
- `/admin/process-orders/[id]`
- `/admin/customers`
- `/admin/customers/[id]`
- `/admin/uploads`
- `/admin/tracking`
- `/admin/audit`

## Data source

Admin membaca data melalui server-side service/repository/API route. Client component tidak boleh import Supabase service-role logic atau `supabase-admin.client`.

Jika `DATABASE_PROVIDER=supabase`, admin membaca data Supabase melalui repository factory. Jika `DATABASE_PROVIDER=mock`, admin tetap memakai mock fallback.

## Internal auth status

Phase 16 masih memakai mock internal admin guard untuk development. Di production, Ofissio Admin wajib memakai real internal auth dan role mapping yang sudah diverifikasi.

## Upload/logo permission boundary

Customer upload company logo hanya untuk role `company_admin` dan `purchasing`. Role `approver`, `viewer`, dan `finance` dapat melihat file/logo company-scoped sesuai kebutuhan, tetapi tidak dapat upload/register/delete logo.

Internal admin role `super_admin`, `sales`, dan `support` dapat melihat semua upload di `/admin/uploads` melalui internal guard. Admin upload atas nama customer belum aktif; jangan memakai endpoint customer untuk upload admin. Jika fitur itu dibutuhkan, buat route eksplisit `/admin/customers/[id]/logos` dan gunakan `companyId` dari path sebagai selected company.

## Known limitation

- Admin auth masih mock/internal placeholder.
- Phase 17 sudah menambahkan pricing manual, customer accept/reject, dan convert-to-order foundation.
- PDF quotation final belum dibuat.
- Convert quotation ke WooCommerce live belum aktif.
- WooCommerce live order sync belum aktif; Phase 18 baru staging foundation.
- Payment tetap mock.
- Shipping tetap mock/manual.
- Supabase Storage live sudah aktif, tetapi admin upload atas nama customer belum tersedia.
- Email real belum aktif.
- Monitoring provider belum aktif.

## Phase 17 quotation management

Ofissio Admin kini memiliki action foundation untuk:

- update status quotation;
- update pricing server-side;
- add internal note;
- send quote to customer lewat email foundation;
- convert quotation menjadi order Ofissio foundation.

Customer dapat melihat penawaran final di `/quotes/[id]` jika status `quoted`, lalu accept/reject/request revision. Internal notes dan sales notes tidak dikirim ke customer route.

## Phase 18 WooCommerce sync

Ofissio Admin kini menampilkan panel WooCommerce sync di:

- `/admin/orders/[id]`
- `/admin/quotations/[id]`

Panel menampilkan `woo_order_id`, nomor Woo, status sync, error aman, link WP admin jika tersedia, dan tombol retry. Retry hanya membuat order Woo jika order Ofissio belum punya `woo_order_id`.

## Phase 18 order routing

Ofissio Admin juga menampilkan routing proses order:

- `fulfillment`: produk standar tanpa custom, flow picking → packing → shipping.
- `customization`: produk standar dengan logo/bordir/sablon/nama, flow ambil produk standar → custom → QC custom → packing.
- `production`: custom design/model/bahan/desain khusus, flow approval desain → bahan → cutting → sewing → bordir/sablon → finishing → QC → packing.

Produk standar tidak memakai status `out of stock` customer-facing. Jika stok internal kurang, admin memakai warning `Replenishment needed`.

## Phase 19 process orders

Ofissio Admin kini memiliki menu Process Orders untuk dokumen kerja internal:

- Fulfillment Order untuk produk standar tanpa custom.
- Customization Order untuk produk standar dengan logo/bordir/sablon/nama.
- Production Order / SPK untuk desain/model/bahan khusus.

Admin membuat process order dari detail order. Sistem menentukan route dari order routing Phase 18, membuat task checklist default, menyimpan event timeline, dan memperbarui tracking customer dengan label sederhana.
