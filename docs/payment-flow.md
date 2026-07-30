# Payment Flow - Ofissio Phase 23

## Mock mode

1. Customer checkout atau admin order membuat payment.
2. Provider `mock` mengembalikan URL simulasi.
3. Mock success endpoint bisa menandai paid untuk development.
4. Tracking ikut update.

## iPaymu staging mode

1. Admin/customer action meminta payment link.
2. Server mengambil order dari repository.
3. Amount dihitung ulang server-side dari order.
4. Server membuat stable `referenceId`.
5. Server memanggil iPaymu redirect/payment link API.
6. Payment URL dan metadata disimpan ke `payments`.
7. Admin bisa regenerate invoice agar payment block memakai link terbaru.
8. Customer klik `Bayar Sekarang`.
9. Return page hanya menampilkan status verifying.
10. Callback valid memperbarui payment/order/tracking.

## Status mapping

- `waiting_payment`: payment link dibuat, belum paid.
- `paid`: callback valid berhasil.
- `failed`: callback valid gagal/unknown.
- `expired`: callback valid expired.
- `cancelled`: callback valid cancelled.

## WooCommerce foundation

Jika `woo_order_id` ada dan Woo sync enabled, status payment paid dapat disinkronkan ke WooCommerce. Jika env WooCommerce belum ada, sync diskip aman dan tidak memblokir payment.

## Relation to shipping

Payment dan shipment tetap dipisah. Status paid tidak otomatis membuat resi atau memilih ekspedisi. Setelah order siap, admin membuat shipment manual di Ofissio Admin dan update shipment akan menyinkronkan tracking customer.
