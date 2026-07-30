# Phase 24: Shipment Production Flow

## Scope

Phase 24 menambahkan manual shipment foundation untuk menghubungkan order, process order, admin shipping workbench, customer tracking, dan Ofistant order status.

## File utama

- `database/migrations/009_shipments_flow.sql`
- `src/features/shipments/*`
- `src/features/repositories/mock/mock-shipment.repository.ts`
- `src/features/repositories/supabase/supabase-shipment.repository.ts`
- `src/app/api/admin/shipments/*`
- `src/app/api/admin/orders/[id]/shipments/route.ts`
- `src/app/api/admin/process-orders/[id]/shipments/route.ts`
- `src/app/api/orders/[id]/shipment/route.ts`
- `src/app/api/shipments/[id]/route.ts`
- `src/app/admin/shipments/*`
- `scripts/check-shipping.ts`

## Migration

Migration 009 harus dijalankan manual di Supabase SQL Editor sebelum live persistence smoke. Codex tidak menjalankan migration otomatis.

## Acceptance mapping

- Admin bisa membuat shipment dari order/process order.
- Admin bisa update provider, service, resi, tracking URL, dan status.
- Event shipment dicatat.
- Customer tracking ikut update dengan label ramah customer.
- Ofistant tidak mengarang resi jika data belum tersedia.
- Provider API live masih skipped/foundation.

## Known limitation

- Multi-package shipment belum aktif.
- Provider booking/tracking API belum aktif.
- Delivery note PDF belum dibuat di Phase 24.
