# Phase 5 — Payment dan Shipping Foundation

Phase 5 memakai provider `mock` secara default. Tidak ada pembayaran atau
pengiriman nyata yang dibuat.

## Payment

- `src/features/payment/payment.service.ts` menghitung ulang subtotal dari
  checkout-cart server dan menambahkan pajak serta ongkir terpilih.
- `mock-payment.provider.ts` menghasilkan URL sandbox lokal.
- `ipaymu.provider.ts` adalah boundary fail-closed. Live request, signature,
  callback headers, dan status mapping wajib disesuaikan dengan dokumentasi
  merchant iPaymu resmi sebelum provider diaktifkan.
- Callback iPaymu divalidasi, diverifikasi oleh provider, dibandingkan nominal,
  dan memakai event-id store untuk idempotensi.
- API status tidak mengembalikan raw provider response.

## Shipping

- Browser hanya mengirim tujuan dan item. Berat dari browser diabaikan.
- Selama product data belum memiliki berat, backend memakai 500 gram per unit.
- Mock provider menyediakan JNE REG, J&T EZ, Cargo, dan pickup.
- Hasil rate disimpan di cache proses selama 10 menit.
- Endpoint rates memiliki rate-limit placeholder 30 request per menit/client.
- Error provider jatuh ke manual quotation provider.

## Checkout-cart server

Cart utama tetap berada pada Zustand/localStorage sesuai Phase 4C. Sebelum
payment, checkout mengirim identitas item, warna, size matrix, dan placement ke
`POST /api/checkout/cart`. Backend mengambil ulang produk dari `productService`,
menolak produk draft/tanpa GLB, memvalidasi MOQ, dan menghitung ulang harga.

Checkout-cart, payment, order payment, rate cache, dan shipment masih disimpan
di memory proses. Semua record hilang saat server restart.

## Development flow

1. Gunakan `PAYMENT_PROVIDER=mock` dan `SHIPPING_PROVIDER=mock`.
2. Tambahkan KK-006 ke cart dan buka `/checkout`.
3. Klik **Cek Ongkir**, pilih rate, lalu **Lanjut Pembayaran**.
4. Di `/payment/mock/success`, klik **Simulasikan Berhasil**.
5. Periksa `GET /api/payment/status?paymentId=...`; status payment harus
   `paid` dan order harus `payment_received`.

Return URL browser bukan bukti pembayaran. Hanya callback terverifikasi atau
endpoint mock yang tersedia dalam mode mock yang dapat mengubah status.
