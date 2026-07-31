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
- Generate/download quotation PDF.
- Generate/download invoice PDF.
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
- `/admin/products`
- `/admin/products/new`
- `/admin/products/woocommerce/[id]`
- `/admin/catalog/categories`
- `/admin/catalog/industries`
- `/admin/catalog/attributes`
- `/admin/uploads`
- `/admin/tracking`
- `/admin/audit`

## Data source

Admin membaca data melalui server-side service/repository/API route. Client component tidak boleh import Supabase service-role logic atau `supabase-admin.client`.

Jika `DATABASE_PROVIDER=supabase`, admin membaca data Supabase melalui repository factory. Jika `DATABASE_PROVIDER=mock`, admin tetap memakai mock fallback.

## Catalog taxonomy

Task A2.5 menambahkan catalog workbench:

- Product categories berasal dari WooCommerce; Ofissio hanya menambahkan active state dan synonym.
- Industry master berasal dari Ofissio dan disimpan ke Supabase setelah migration 010.
- Product attributes dan terms dibaca dari WooCommerce (read-only pada task ini).

Role `super_admin` dan `product_admin` dapat mengubah taxonomy. Role internal yang memiliki `admin:catalog:view` hanya dapat membaca.

## Product readiness

Task A2.6 menambahkan `/admin/products` sebagai daftar lengkap produk WooCommerce, termasuk produk yang belum valid untuk customer. Halaman ini menampilkan status Ofissio, status GLB, dan maksimal tiga field blocking pertama. Detail `/admin/products/woocommerce/[id]` menampilkan seluruh blocking issue dan warning.

Customer catalog dan Ofistant tetap membaca produk yang lolos readiness saja. Task A3 mengaktifkan create/edit produk WooCommerce dan upload GLB privat langsung dari Ofissio Admin.

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
- Email real staging sudah siap via Resend Phase 21 jika env/domain verified; default tetap mock.
- PDF document persistence membutuhkan migration 007 di Supabase sebelum live generate.
- Monitoring provider belum aktif.
- Persistence taxonomy lintas restart membutuhkan migration 010. Sebelum migration diterapkan, development memakai fallback in-memory.
- Upload gambar WordPress langsung belum tersedia; Task A3 memakai input URL gambar.
- GLB version history dan cleanup object lama belum memiliki UI lifecycle khusus.

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

## Phase 22 PDF documents

Ofissio Admin kini memiliki section Documents:

- `/admin/quotations/[id]`: generate/regenerate/download PDF penawaran.
- `/admin/orders/[id]`: generate/download invoice PDF dengan template `invoice_ofissio_custom`.

Endpoint generate memakai internal admin guard. Customer hanya menerima signed URL melalui route company-scoped dan tidak melihat storage key/bucket/provider internals.

## Phase 24 shipments

Ofissio Admin kini memiliki menu Shipments dan panel Shipment di detail Order serta Process Order.

Admin logistics/super admin dapat membuat shipment manual, mengisi provider, service, nomor resi, tracking URL, dan status pengiriman. Update shipment akan memperbarui customer tracking dengan label yang aman untuk customer.

Provider API live belum aktif; Phase 24 tidak melakukan booking kurir otomatis dan tidak mengarang tracking URL.

## Phase 25 final staging status

Ofissio Admin sudah lolos final staging smoke untuk route utama:

- `/admin`
- `/admin/quotations`
- `/admin/quotations/[id]`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/process-orders`
- `/admin/process-orders/[id]`
- `/admin/shipments`
- `/admin/shipments/[id]`
- `/admin/uploads`
- `/admin/customers`
- `/admin/audit`

Admin shell harus tetap isolated dari customer shell. Route admin tidak boleh menampilkan Ofistant, cart, `Masuk`, customer header, customer floating preview, atau bottom bar.

Phase 25 smoke terbaru membuktikan:

- quotation admin workflow berjalan sampai convert order;
- payment panel mencatat payment mock dan event;
- process order dibuat idempotent sesuai route;
- task checklist memperbarui progress;
- shipment manual tersimpan sampai delivered;
- upload/logo customer terlihat di admin uploads tanpa membocorkan service-role key.

## Task A5 quantity pricing

Product admin mengatur harga bertingkat dari `/admin/products/new` atau `/admin/products/woocommerce/[id]`. Permission write tetap `admin:catalog:update`; customer dan role view-only tidak dapat memanggil endpoint update. Semua write action memakai rate limit, validasi server, safe error, serta audit `product_quantity_pricing_updated` atau `product_quantity_pricing_update_failed`.

## Task A4 embroidery pricing

Product admin mengatur harga bordir per zona dari form create/edit yang sama. Setup fee bernilai nol tidak ditampilkan ke customer. Endpoint khusus memakai permission `admin:catalog:update` dan mencatat audit `product_embroidery_pricing_updated` atau `product_embroidery_pricing_update_failed`. Admin quotation dapat melihat original breakdown dan override unit price/setup fee per zona sebelum mengirim penawaran.
