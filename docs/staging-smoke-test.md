# Staging smoke test

Jalankan checklist ini setiap deploy staging.

## Customer flow

- [ ] Buka homepage.
- [ ] Buka `/catalog`.
- [ ] Buka `/product/kemeja-kantor-kk-006`.
- [ ] Pastikan `/3d/kk-006.glb` 200.
- [ ] Preview 3D membuka canvas.
- [ ] Upload logo valid via Studio Bordir atau dashboard.
- [ ] Upload file invalid ditolak dengan safe response.
- [ ] Add to cart.
- [ ] Jika logo dipakai, cart menyimpan `logoFileId`.
- [ ] Checkout.
- [ ] Shipping mock/manual.
- [ ] Payment mock success.
- [ ] Dashboard.
- [ ] Tracking order.
- [ ] Ofistant tracking.
- [ ] Repeat order.
- [ ] Mobile responsive.
- [ ] Console browser 0 error.

## Ofissio Admin flow

- [ ] Buka `/admin`.
- [ ] Buka `/admin/quotations`.
- [ ] Buka `/admin/quotations/[id]` untuk quotation Supabase.
- [ ] Detail quotation menampilkan size matrix, logo file id, embroidery placements, `model3dId`, dan `model3dUrl`.
- [ ] Update status quotation foundation via admin.
- [ ] Buka `/admin/orders`.
- [ ] Buka `/admin/uploads`.
- [ ] Buka `/admin/tracking`.
- [ ] Buka `/admin/customers`.
- [ ] Buka `/admin/audit`.
- [ ] Mobile admin tidak horizontal overflow.
- [ ] Browser console admin 0 error.

## Phase 17 quotation management flow

- [ ] Jalankan manual migration `database/migrations/003_quotation_management.sql` di staging jika ingin mengaktifkan tabel `quotation_events`.
- [ ] Buat quotation dari customer flow.
- [ ] Admin buka `/admin/quotations/[id]`.
- [ ] Admin mark `under_review`.
- [ ] Admin update pricing.
- [ ] Admin mark `quoted`.
- [ ] Customer buka `/quotes/[id]` dan melihat harga final.
- [ ] Customer accept quotation.
- [ ] Admin convert quotation to order.
- [ ] Convert kedua kali idempotent.
- [ ] Order muncul di `/admin/orders`.
- [ ] Order muncul di customer dashboard dan `/orders/[id]`.
- [ ] Internal notes tidak tampil di response customer.
- [ ] Customer company lain tidak bisa baca quotation.

## Phase 18 WooCommerce staging sync flow

- [ ] Jalankan `npm run check:woocommerce`.
- [ ] Jika env WooCommerce kosong, hasil `SKIP` dan mode mock tetap berjalan.
- [ ] Jika `PRODUCT_SOURCE=woocommerce`, hanya produk published dengan GLB valid yang tampil.
- [ ] Produk WooCommerce tanpa GLB valid tidak tampil di `/catalog`.
- [ ] Produk WooCommerce tanpa GLB valid tidak bisa masuk cart.
- [ ] Produk standar tidak menampilkan `out of stock` / `stok habis` ke customer.
- [ ] Jika `WOOCOMMERCE_SYNC_ORDERS=true`, direct checkout mock membuat/menandai sync Woo.
- [ ] Convert quotation to order tetap membuat order Ofissio meskipun Woo sync gagal.
- [ ] `/admin/orders/[id]` menampilkan panel WooCommerce sync.
- [ ] `/admin/quotations/[id]` menampilkan panel WooCommerce sync.
- [ ] `/admin/orders` menampilkan `process_route`, `process_status`, dan replenishment internal.
- [ ] Admin order detail menampilkan tombol sesuai route, bukan selalu Production Order.
- [ ] Order standar tanpa custom route `fulfillment`.
- [ ] Order dengan bordir/logo route `customization`.
- [ ] Order dengan custom design/model/bahan khusus route `production`.
- [ ] Retry sync admin tidak membuat order Woo duplikat jika `woo_order_id` sudah ada.
- [ ] Secret WooCommerce tidak muncul di client bundle.

## Phase 19 process order flow

- [ ] Jalankan manual migration `database/migrations/005_process_orders.sql` jika ingin menguji Supabase persistence process order.
- [ ] Buka `/admin/orders/[id]`.
- [ ] Klik tombol proses order sesuai route.
- [ ] Response mengembalikan `processOrderId`, `processOrderNumber`, `processRoute`, dan `idempotent`.
- [ ] Klik tombol yang sama kedua kali tidak membuat process order duplikat.
- [ ] Buka `/admin/process-orders`.
- [ ] Buka `/admin/process-orders/[id]`.
- [ ] Task checklist tampil.
- [ ] Complete satu task foundation.
- [ ] Customer tracking berubah memakai label customer-friendly.
- [ ] Standard no custom → Fulfillment Order.
- [ ] Standard + logo/bordir → Customization Order.
- [ ] Custom design/model/bahan khusus → Production Order.
- [ ] Replenishment warning hanya tampil di admin.
- [ ] Customer UI tidak menampilkan “out of stock” atau “replenishment needed”.

## Phase 20 Supabase Storage live flow

- [ ] Jalankan `npm run check:storage`.
- [ ] Jika `STORAGE_PROVIDER=mock`, hasil harus pass/skipped jelas.
- [ ] Jika `STORAGE_PROVIDER=supabase`, bucket `ofissio-logos`, `ofissio-artwork`, `ofissio-documents`, dan `ofissio-3d-models` harus reachable.
- [ ] Upload logo valid dari Logo Library.
- [ ] Metadata `uploaded_files` tersimpan.
- [ ] Metadata `company_logos` tersimpan.
- [ ] Logo preview tampil via signed URL.
- [ ] Restart dev/staging server.
- [ ] Logo preview tetap tampil jika Supabase Storage aktif.
- [ ] `/admin/uploads` menampilkan provider, bucket, file type, status, dan action View.
- [ ] Invalid extension/MIME/size ditolak dengan safe error.
- [ ] Company mismatch file detail/signed-url/delete ditolak 403/404.
- [ ] `/3d/kk-006.glb` tetap 200 dan tidak dipindah ke Supabase Storage.

## Security smoke

- [ ] Secret tidak muncul di client bundle.
- [ ] API invalid request memberi safe response.
- [ ] Admin API butuh internal guard.
- [ ] Admin endpoint tidak expose secret/raw provider error.
- [ ] Produk tanpa GLB tidak tampil.
- [ ] Produk tanpa GLB tidak bisa masuk cart.
- [ ] Company mismatch tracking/payment ditolak.
- [ ] Company mismatch file detail/signed-url/delete ditolak.
- [ ] Company mismatch quotation list/detail ditolak.
- [ ] Storage secret tidak muncul di client bundle.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` tidak muncul di client bundle.

## Conditional staging integrations

- [ ] WooCommerce staging test jika env tersedia.
- [ ] Email test jika Resend tersedia.
- [ ] Supabase database test jika env tersedia: health connected, quotation/email log/upload metadata/company logo tersimpan.
- [ ] Supabase Storage test jika env tersedia.
- [ ] iPaymu sandbox test hanya setelah signature resmi diimplementasikan.
- [ ] Shipping provider sandbox test hanya setelah provider real dipilih.
