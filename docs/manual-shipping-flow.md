# Manual Shipping Flow

Phase 24 memakai mode manual sebagai default.

## Cara pakai admin

1. Buka `/admin/orders`.
2. Buka detail order.
3. Di panel `Shipment`, klik `Buat shipment`.
4. Pilih provider dan service.
5. Jika resi sudah ada, isi nomor resi.
6. Jika ada link tracking resmi, isi `Tracking URL manual`.
7. Update status sesuai kondisi operasional.

Alternatifnya, shipment juga bisa dibuat dari `/admin/process-orders/[id]`.

## Idempotency

Satu order hanya memiliki satu shipment aktif pada foundation ini. Jika tombol create diklik ulang, sistem memakai shipment existing.

## Status update customer

Saat admin update shipment, sistem menyinkronkan `tracking_records.tracking_json`: resi, provider/service, shipment timeline, next step, dan status note customer-friendly.

## Batasan

- Belum ada booking courier otomatis.
- Belum ada validasi resi ke provider.
- Tracking URL tidak ditebak; admin harus mengisi link manual jika ingin customer bisa klik.
