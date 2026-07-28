# Phase 6B - Integrasi Tracking dengan Payment dan Shipping

Phase 6B menghubungkan Payment/Shipping Foundation Phase 5 dengan Dashboard dan Tracking UI Phase 6.

## Flow setelah payment success

1. Checkout membuat `PaymentOrderRecord` dari cart tervalidasi backend.
2. Customer memilih shipping rate mock.
3. Payment mock dibuat oleh `/api/payment/ipaymu/create`.
4. Customer membuka `/payment/mock/success?paymentId=...`.
5. Tombol `Simulasikan Berhasil` memanggil `/api/payment/mock/complete`.
6. Payment berubah menjadi `paid`.
7. Order payment berubah menjadi `payment_received`.
8. `upsertTrackingFromPaymentOrder()` membuat atau mengupdate tracking record server-memory.
9. Dashboard mengambil `/api/tracking/orders`.
10. Detail order membuka `/orders/{orderId}` lewat `/api/tracking/orders/{id}`.

## Idempotency

Tracking record disimpan di server memory dengan key `order.id`.

Jika payment success diproses dua kali:

- payment completion tetap idempotent
- tracking tidak dibuat dua kali
- record existing diupdate jika perlu

## Status awal paid

Untuk KK-006 saat ini fulfillment canonical tetap `MADE_TO_ORDER`.

Setelah mock payment success:

- Payment status: `Lunas`
- Current status: `Pembayaran dikonfirmasi`
- Next step: `Approval desain / Persiapan produksi`
- Shipment: menunggu produksi selesai

## Data yang masuk tracking

Tracking dari payment order menyimpan:

- orderId
- orderNumber dari payment reference
- paymentStatus
- orderStatus
- fulfillmentType
- selectedShippingRate
- product name
- SKU
- selected color
- size matrix
- total qty
- embroidery placements
- model3dId
- model3dUrl

## Limitasi

Data order/payment/tracking masih memory process dan akan hilang saat server restart. Integrasi ini belum memakai database production, WooCommerce, iPaymu live, shipping provider real, admin production update real, atau security hardening penuh.
