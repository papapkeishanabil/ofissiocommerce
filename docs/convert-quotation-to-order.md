# Convert Quotation to Order

Phase 17 menambahkan foundation untuk mengubah quotation menjadi order Ofissio tanpa membuat WooCommerce order live.

## Kapan quotation bisa dikonversi

Admin dapat menjalankan `convert_to_order` jika:

- status quotation `accepted`, atau
- status quotation `quoted` dan sales melakukan konfirmasi internal,
- harga final lengkap,
- quotation belum pernah dikonversi.

Jika `convertedOrderId` sudah ada, action bersifat idempotent dan mengembalikan order existing.

## Data yang dibuat

Backend membuat:

1. `orders` dengan `transactionMode=quotation_converted`.
2. `payments` mock/waiting payment.
3. `tracking_records` initial.
4. update quotation menjadi `converted_to_order`.
5. quotation event `converted_to_order`.
6. audit log internal.

## WooCommerce

`wooOrderId` tetap `null` pada Phase 17. WooCommerce live sync disiapkan untuk Phase 18.

## Tracking awal

Order hasil convert muncul di:

- `/admin/orders`
- `/admin/orders/[id]`
- customer dashboard
- `/orders/[id]`
- `/admin/tracking`

Payment dan shipping tetap foundation/mock.

## Idempotency

Jika admin klik convert lebih dari sekali:

- backend mengecek `convertedOrderId`,
- tidak membuat order/payment/tracking baru,
- response mengembalikan order existing jika masih tersedia.

## Limitation

- Payment URL real belum dibuat.
- Shipping provider real belum dipanggil.
- WooCommerce order belum dibuat.
- Production tracking update lengkap masuk fase berikutnya.
