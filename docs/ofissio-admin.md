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
- Company/customer operational data.
- Operational order detail.
- Tracking produksi.
- Audit/activity view foundation.

## Route admin

- `/admin`
- `/admin/quotations`
- `/admin/quotations/[id]`
- `/admin/orders`
- `/admin/orders/[id]`
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

## Known limitation

- Admin auth masih mock/internal placeholder.
- Phase 17 sudah menambahkan pricing manual, customer accept/reject, dan convert-to-order foundation.
- PDF quotation final belum dibuat.
- Convert quotation ke WooCommerce live belum aktif.
- WooCommerce live order sync belum aktif.
- Payment tetap mock.
- Shipping tetap mock/manual.
- Supabase Storage live belum aktif.
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
