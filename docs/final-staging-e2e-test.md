# Final staging E2E test

Tanggal test: 30 Juli 2026.

Base URL lokal: `http://localhost:8000`

## Command validation

Perintah yang wajib dijalankan sebelum menutup Phase 25:

```bash
npm run check:env
npm run check:supabase
npm run check:storage
npm run check:woocommerce
npm run check:email
npm run check:documents
npm run check:payment
npm run check:shipping
npm run typecheck
npm run lint
npm run build
npm run check:all
npm run verify:supabase-persistence
npm run test:company-isolation
```

Catatan: `check:woocommerce` boleh `SKIP` jelas selama WooCommerce env staging belum aktif. `check:email` boleh mock/skipped selama Resend live belum aktif. Payment dan shipping provider real tidak diaktifkan pada Phase 25.

## Live E2E flow yang diuji

Run ID: `PHASE25_20260730161749`

1. `/api/health` mengembalikan database `connected` dan schema `ready`.
2. Customer role `purchasing` upload logo PNG.
3. Customer role `viewer` ditolak untuk upload logo.
4. Company logo diregistrasi.
5. File list/detail/signed URL company-scoped.
6. Company B ditolak membaca file Company A.
7. Cart sync menerima KK-006 dengan placement bordir.
8. Customer request quotation.
9. Customer quotation detail tidak expose internal notes/sales notes.
10. Company B ditolak membaca quotation Company A.
11. Admin update status `under_review`.
12. Admin add internal note.
13. Admin update pricing.
14. Admin mark `quoted`.
15. Admin send quote to customer via email foundation mock.
16. Admin generate quotation PDF.
17. Customer accept quotation.
18. Admin convert quotation to order.
19. Admin create payment link mock.
20. Payment events mencatat `payment_created` dan `payment_link_created`.
21. Customer mock complete paid.
22. Duplicate mock complete idempotent.
23. Company B tidak bisa mark payment Company A.
24. Admin generate invoice PDF `invoice_ofissio_custom`.
25. Customer dapat mengambil signed URL invoice.
26. Admin create process order.
27. Duplicate create process order idempotent.
28. Process order punya items/tasks/events.
29. Complete task memperbarui progress.
30. Customer/support ditolak untuk action process order yang tidak berwenang.
31. Admin create shipment manual.
32. Admin input resi/status sampai `delivered`.
33. Shipment events mencatat `shipment_created`, `tracking_number_added`, `shipment_in_transit`, `shipment_delivered`.
34. Customer `/orders/[id]` dan tracking menampilkan resi.
35. Internal shipment notes tidak muncul ke customer.
36. Customer/support ditolak untuk create/update shipment admin.

## Browser smoke

Browser smoke dilakukan dengan Edge headless via Chrome DevTools Protocol.

- Desktop routes tested: 8.
- Mobile routes tested: 10.
- Browser console errors: 0.
- Horizontal overflow failures: 0.
- Product 3D canvas: visible.
- Ofistant customer route: visible dan dapat melihat tracking number.
- Admin isolation: `/admin`, `/admin/orders`, `/admin/process-orders`, `/admin/shipments`, `/admin/uploads` tidak menampilkan `Ofistant`, `Keranjang`, atau `Masuk`.

## Route audit

Semua route berikut tidak menghasilkan 500:

- `/`
- `/catalog`
- `/product/kemeja-kantor-kk-006`
- `/cart`
- `/checkout`
- `/dashboard`
- `/quote`
- `/quotes/quo_99c0ee0a-7673-4efb-8381-a18f4f2fbbb0`
- `/orders/ord_6f8b6aa1-212c-4da9-8f8f-f34f53c2c317`
- `/payment/return`
- `/payment/cancel`
- `/payment/success`
- `/payment/failed`
- `/admin`
- `/admin/quotations`
- `/admin/quotations/quo_99c0ee0a-7673-4efb-8381-a18f4f2fbbb0`
- `/admin/orders`
- `/admin/orders/ord_6f8b6aa1-212c-4da9-8f8f-f34f53c2c317`
- `/admin/process-orders`
- `/admin/process-orders/pro_b5f40043-6470-4a1f-800d-b8c92f545790`
- `/admin/shipments`
- `/admin/shipments/shp_a04abf7e-dc06-4780-9a30-9f9dd3778dd6`
- `/admin/uploads`
- `/admin/customers`
- `/admin/audit`

Asset `/3d/kk-006.glb` mengembalikan `200` dengan content type `model/gltf-binary`.

## Known limitation

- Test masih memakai auth mock.
- Payment masih mock; iPaymu live/sandbox belum aktif.
- Email masih mock; Resend live belum mengirim email real.
- Shipping provider API real belum aktif; shipment manual.
- WooCommerce env belum aktif; mode mock tetap pass.
- Browser smoke memakai Edge headless lokal, bukan cross-browser matrix penuh.

