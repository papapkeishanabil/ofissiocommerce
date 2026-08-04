# Admin roles

Phase 16 memakai internal role foundation berikut:

Role canonical Task D:

- `super_admin`
- `sales_admin`
- `production_admin`
- `finance_admin`

Role berikut dipertahankan sementara sebagai compatibility alias/foundation:

- `super_admin`
- `sales`
- `finance_internal`
- `product_admin`
- `production_admin`
- `ppic`
- `qc`
- `logistics`
- `support`

## Permission foundation

- `super_admin`: semua akses admin.
- `sales`: quotation, order read, upload/customer view, quotation status update.
- `finance_internal`: quotation/order read.
- `product_admin`: upload/customer foundation view.
- `production_admin`: order/tracking/upload view dan tracking update foundation.
- `ppic`, `qc`, `logistics`: order/tracking view dan tracking update foundation.
- `support`: view dashboard, quotation, order, tracking, upload, customer, audit.

## Production requirement

Mock internal guard hanya boleh pada `AUTH_MODE=development` dengan flag explicit.
Production memakai Supabase session dan role `internal_user_profiles`; header
development selalu dibuang/ditolak.
