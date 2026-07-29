# Admin roles

Phase 16 memakai internal role foundation berikut:

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

Mock internal guard hanya untuk development/staging foundation. Production wajib memakai real internal auth, session, audit actor, dan permission review.
