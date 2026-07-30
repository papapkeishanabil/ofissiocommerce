# Shipment Flow

Phase 24 menambahkan alur pengiriman manual untuk order yang sudah masuk Ofissio Admin.

## Prinsip

- Produk standar tetap bisa dipesan customer; tidak ada tampilan “stok habis” di customer UI.
- Pengiriman dibuat manual oleh internal admin dari order atau process order.
- Nomor resi, provider, service, status, dan tracking URL diinput admin.
- Provider API belum dipanggil otomatis pada Phase 24.
- Data sensitif provider tidak dikirim ke client.

## Status shipment

- `draft`
- `ready_to_ship`
- `booked`
- `picked_up`
- `in_transit`
- `delivered`
- `failed`
- `returned`
- `cancelled`

## Admin routes

- `/admin/shipments`
- `/admin/shipments/[id]`
- `/admin/orders/[id]` panel shipment
- `/admin/process-orders/[id]` panel shipment

## Customer visibility

Customer hanya melihat status pengiriman, provider/service jika sudah diinput, nomor resi jika sudah tersedia, dan tracking URL manual jika admin mengisinya.

Customer tidak melihat storage key, provider payload mentah, service role key, atau replenishment internal.
