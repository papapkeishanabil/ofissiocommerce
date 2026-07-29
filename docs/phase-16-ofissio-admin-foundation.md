# Phase 16 — Ofissio Admin Foundation

Status: implemented as internal admin foundation.

## Implemented

- Admin route layout with responsive sidebar and content area.
- Internal mock admin guard foundation.
- Admin dashboard summary.
- Admin quotations list.
- Admin quotation detail with size matrix, `model3dId`, `model3dUrl`, embroidery placements, `logoFileId`, and safe logo preview fallback.
- Admin quotation status update foundation through `PATCH /api/admin/quotations/[id]`.
- Admin orders list and detail read-only foundation.
- Admin uploads/logos metadata list.
- Admin tracking overview read-only foundation.
- Admin customers list/detail foundation.
- Admin audit list foundation.
- Server-side admin API routes.

## API routes

- `GET /api/admin/summary`
- `GET /api/admin/quotations`
- `GET /api/admin/quotations/[id]`
- `PATCH /api/admin/quotations/[id]`
- `GET /api/admin/orders`
- `GET /api/admin/orders/[id]`
- `GET /api/admin/uploads`
- `GET /api/admin/tracking`
- `GET /api/admin/customers`
- `GET /api/admin/audit`

All admin API routes use internal guard, rate limit, safe errors, and server-side data access.

## Guardrail

- KK-006 remains `/3d/kk-006.glb`.
- Customer endpoints remain company-scoped.
- Client components do not import `supabase-admin.client`.
- Admin data is read through service/repository/API boundaries.
- Service role key must stay server-side only.

## Known limitation

- Admin auth is mock/internal placeholder.
- Admin status update is foundation only.
- Convert quotation to order is not implemented.
- Final quotation pricing is not implemented.
- WooCommerce live sync is not activated.
- Payment remains mock.
- Shipping remains mock/manual.
- Supabase Storage live is not activated.
- Real email is not activated.
- npm audit vulnerabilities are not addressed in this phase.
