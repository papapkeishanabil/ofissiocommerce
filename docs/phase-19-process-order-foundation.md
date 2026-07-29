# Phase 19: Fulfillment, Customization & Production Order Foundation

## Status

Implemented foundation.

## Yang ditambahkan

- Migration `005_process_orders.sql`.
- Feature module `src/features/process-orders/`.
- Mock dan Supabase process order repository.
- Admin API:
  - `GET /api/admin/process-orders`
  - `GET /api/admin/process-orders/[id]`
  - `PATCH /api/admin/process-orders/[id]`
  - `POST /api/admin/process-orders/[id]/tasks/[taskId]/complete`
  - `POST /api/admin/process-orders/[id]/events`
- Admin UI:
  - `/admin/process-orders`
  - `/admin/process-orders/[id]`
- Existing `POST /api/admin/orders/[id]/process` sekarang membuat process order idempotent.

## Route behavior

- `fulfillment` → Fulfillment Order.
- `customization` → Customization Order.
- `production` → Production Order / SPK.

## Tracking behavior

Saat process order dibuat atau task selesai, tracking customer di-update dengan label aman dan sederhana. Replenishment internal tidak ditampilkan ke customer.

## Supabase note

Migration 005 wajib dijalankan manual di Supabase SQL Editor sebelum persistence process order aktif di Supabase. Read/list repository dibuat graceful agar halaman lama tidak rusak jika tabel belum diterapkan.

## Tidak dilakukan di Phase 19

- Tidak ada WooCommerce live activation.
- Tidak ada payment live.
- Tidak ada shipping provider real.
- Tidak ada full PPIC scheduling.
- Tidak ada Gantt/kanban produksi penuh.
- Tidak ada PDF SPK produksi.
