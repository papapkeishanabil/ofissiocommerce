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

## Phase 21 Resend email staging flow

- [ ] Jalankan `npm run check:email`.
- [ ] Jika `EMAIL_PROVIDER=mock`, hasil pass/skipped jelas.
- [ ] Jika `EMAIL_PROVIDER=resend`, pastikan `EMAIL_FROM` domain verified.
- [ ] Jika ingin real send, jalankan `EMAIL_TEST_SEND=true npm run check:email`.
- [ ] Submit quotation dari customer.
- [ ] Email log `quotation_request_sales` dibuat.
- [ ] Email log `quotation_confirmation_customer` dibuat jika customer email tersedia.
- [ ] Admin buka `/admin/quotations/[id]` dan melihat email delivery status.
- [ ] Admin update pricing, mark quoted, lalu klik `Send quote to customer`.
- [ ] Email log `quotation_ready_customer` dibuat.
- [ ] Customer `/quotes/[id]` tidak menampilkan provider/raw error/internal notes.
- [ ] Customer tidak bisa trigger `/api/quotation/email` legacy.
- [ ] `RESEND_API_KEY` tidak muncul di client bundle.

## Phase 22 PDF document flow

- [ ] Jalankan manual migration `database/migrations/007_documents_pdf.sql` jika ingin menguji PDF persistence live.
- [ ] Jalankan `npm run check:documents`.
- [ ] Jika migration 007 belum diterapkan, hasil harus `SKIP` dengan alasan jelas.
- [ ] Jika migration 007 sudah diterapkan, table `documents` dan kolom PDF quotation/order harus ready.
- [ ] Admin buka `/admin/quotations/[id]` dengan status final.
- [ ] Klik Generate PDF penawaran.
- [ ] Dokumen muncul di bucket `ofissio-documents` dan metadata `documents`.
- [ ] Admin download PDF penawaran.
- [ ] Customer buka `/quotes/[id]` dan download PDF milik company sendiri.
- [ ] Customer company lain tidak bisa download.
- [ ] Admin buka `/admin/orders/[id]`.
- [ ] Generate invoice dengan template `invoice_ofissio_custom`.
- [ ] Invoice menampilkan header OFISSIO, badge payment, hero navy/kuning, amount in words, tabel item, summary, signature, dan footer.
- [ ] Customer `/orders/[id]` dapat download invoice jika tersedia.
- [ ] Storage key/bucket/provider internals tidak muncul di response customer.
- [ ] Email quotation ready mengarah ke portal link PDF foundation.

## Phase 23 iPaymu payment foundation

- [ ] Jalankan `npm run check:payment`.
- [ ] Mode mock harus pass/skipped jelas.
- [ ] Jika `PAYMENT_PROVIDER=ipaymu`, env sandbox lengkap dan `IPAYMU_ENABLED=true`.
- [ ] Admin buka `/admin/orders/[id]` dan buat payment link dari panel Payment.
- [ ] Payment URL tersimpan di payment record jika provider mengembalikan.
- [ ] Regenerate invoice setelah payment link dibuat.
- [ ] Invoice menampilkan payment link/expiry atau placeholder aman jika link belum ada.
- [ ] `/payment/return` tidak menandai paid.
- [ ] Callback invalid ditolak dan tidak mengubah order paid.
- [ ] Callback duplicate valid idempotent.
- [ ] Tracking customer update setelah payment paid valid.

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
- [ ] `RESEND_API_KEY` tidak muncul di client bundle.
- [ ] `NEXT_PUBLIC_RESEND_API_KEY` tidak diset.
- [ ] `ofissio-documents` tetap private dan PDF hanya lewat signed URL.
- [ ] Customer tidak bisa generate PDF lewat endpoint admin.
- [ ] Internal notes quotation/order tidak muncul di PDF customer.

## Conditional staging integrations

- [ ] WooCommerce staging test jika env tersedia.
- [ ] Email test jika Resend tersedia dan domain verified.
- [ ] Supabase database test jika env tersedia: health connected, quotation/email log/upload metadata/company logo tersimpan.
- [ ] Supabase Storage test jika env tersedia.
- [ ] iPaymu sandbox test hanya setelah env iPaymu lengkap dan migration 008 diterapkan.
- [ ] Shipping provider sandbox test hanya setelah provider real dipilih.

## Phase 24 manual shipment smoke

- [ ] `npm run check:shipping` pass atau skipped jelas jika migration 009 belum diterapkan.
- [ ] `/admin/shipments` terbuka tanpa customer shell.
- [ ] `/admin/orders/[id]` menampilkan panel Shipment.
- [ ] Admin bisa membuat shipment manual dari order setelah migration 009 diterapkan.
- [ ] Admin bisa mengisi resi/status/tracking URL.
- [ ] Customer `/orders/[id]` menampilkan status pengiriman customer-friendly.
- [ ] Ofistant tidak mengarang resi jika data belum tersedia.

## Phase 25 final staging E2E

- [ ] Jalankan semua command validation:
  - `npm run check:env`
  - `npm run check:supabase`
  - `npm run check:storage`
  - `npm run check:woocommerce`
  - `npm run check:email`
  - `npm run check:documents`
  - `npm run check:payment`
  - `npm run check:shipping`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run check:all`
  - `npm run verify:supabase-persistence`
  - `npm run test:company-isolation`
- [ ] Jalankan customer E2E: upload logo, cart, quotation, accept, order, payment mock, tracking.
- [ ] Jalankan admin E2E: pricing quotation, PDF quotation, convert order, create payment link, create process order, complete task, create shipment.
- [ ] Pastikan customer tidak melihat internal notes, replenishment warning, storage key, raw provider response, atau service role data.
- [ ] Pastikan company mismatch ditolak untuk file, quotation, payment, shipment, dan tracking.
- [ ] Pastikan admin route tidak menampilkan Ofistant/cart/customer header.
- [ ] Pastikan `/3d/kk-006.glb` 200 dan 3D configurator canvas muncul.
- [ ] Pastikan browser console 0 error pada route customer/admin utama.
- [ ] Pastikan mobile customer/admin tidak horizontal overflow.
- [ ] Update `docs/final-staging-e2e-test.md` dengan ID smoke test terbaru.

## Task A WooCommerce staging activation

- [ ] Set `PRODUCT_SOURCE=mock` dan `WOOCOMMERCE_ENABLED=false`; `/catalog` tetap 200 dan KK-006 tampil.
- [ ] Jalankan `npm run check:woocommerce`; hasil mock boleh `SKIP` jelas.
- [ ] Jika env WooCommerce staging tersedia, set `PRODUCT_SOURCE=woocommerce` dan `WOOCOMMERCE_ENABLED=true`.
- [ ] Jalankan `npm run check:woocommerce`; products endpoint dan orders read endpoint harus reachable.
- [ ] Pastikan script tidak mencetak consumer key/secret.
- [ ] Pastikan produk WooCommerce valid GLB tampil di `/catalog`.
- [ ] Pastikan produk WooCommerce tanpa GLB/SKU/harga/meta wajib tidak tampil.
- [ ] Buka detail produk WooCommerce valid dan buka 3D configurator.
- [ ] Cart menyimpan `source=woocommerce`, `source_id`, `sku`, `model3dId`, `model3dUrl`, fulfillment type, transaction mode, dan size matrix.
- [ ] Jangan tampilkan `out of stock` / `stok habis` ke customer untuk produk standar.
- [ ] Setelah product source pass, aktifkan `WOOCOMMERCE_SYNC_ORDERS=true` jika ingin test sync order.
- [ ] Jalankan write smoke hanya jika staging sandbox siap: `WOOCOMMERCE_TEST_WRITE=true npm run check:woocommerce`.
- [ ] Admin sync order menyimpan `woo_order_id` di Supabase dan `ofissio_order_id` di Woo order meta.
- [ ] Retry sync tidak membuat Woo order duplikat.
- [ ] Customer tidak bisa trigger endpoint admin sync WooCommerce.
- [ ] `WOOCOMMERCE_CONSUMER_SECRET` tidak muncul di `.next/static`.
