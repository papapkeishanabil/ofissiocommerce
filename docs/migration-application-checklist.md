# Supabase migration application checklist

Apply migrations sequentially to a backed-up target. Record the Supabase project, operator, timestamp, and verification result. Never run `seed-dev.sql` in production.

| Migration | Purpose | Production requirement | Verification |
| --- | --- | --- | --- |
| 001-002 | Base schema, quotation, email, storage metadata | Required | `npm run check:supabase` |
| 003 | Quotation management/events | Required | quotation commercial smoke |
| 004 | WooCommerce order sync metadata | Required when Woo sync is enabled | Woo order sync smoke |
| 005 | Process orders/tasks/events | Required | process-order admin smoke |
| 006 | Live storage metadata | Required | `npm run check:storage` |
| 007 | Quotation/invoice PDF documents | Required | `npm run check:documents` |
| 008 | iPaymu payment fields/events | Required | `npm run check:payment` |
| 009 | Shipment flow/events | Required | shipment persistence check |
| 010 | Catalog taxonomy/industry metadata | Required | catalog/product readiness smoke |
| 011 | Global embroidery pricing | Required | `npm run test:embroidery-pricing` |
| 012 | Admin notifications | Required | `npm run test:admin-notifications` |
| 013 | SMTP email log/provider fields | Required | `npm run check:email` |
| 014 | Tax settings | Required | quotation pricing/tax smoke |
| **015** | Supabase Auth production | **Required** | `npm run check:auth`; auth tables in `check:supabase` |
| 016 | Full-custom quotation request | Required | customer + sales brief smoke |
| 017 | Quotation-request notifications | Required | admin notification smoke |
| **018** | Customer profile and addresses | **Required** | profile/address columns in `check:supabase` |
| **019** | Biteship rates/shipments/events | **Required for carrier flow** | `npm run check:shipping` |
| **020** | Final RLS security review | **Required last security gate** | `npm run check:rls` live inventory |
| 021 | Ginee read-only tables | Optional while Ginee is skipped | `npm run check:ginee` only if activated |
| **022** | WooCommerce stock monitoring/replenishment | **Required** | `npm run check:woocommerce-stock` |
| 023-033 | Bordir WO, MOQ, product import, synonym search, dan lainnya (lihat file migration) | Sesuai fitur yang aktif | check terkait masing-masing |
| **034** | Lembar Approval Desain: nilai CHECK `documents.document_type`/`template_id` baru + max lebar bordir punggung 30 cm | **Required sebelum generate DAS PDF & validasi dimensi live** | `npm run check:documents`; `npm run test:design-approval` |

## Per-environment record

### Staging

- Supabase project/ref:
- Backup before migration:
- Applied through:
- Operator/date:
- `check:supabase` result:
- `check:rls` result:
- Notes:

### Production

- Supabase project/ref:
- Backup before migration:
- Applied through: 034 (manual, Supabase SQL Editor)
- Operator/date: 2026-08-31
- `check:supabase` result:
- `check:rls` result:
- Rollback/restore point:
- Notes: Verifikasi 034 di project `.env.local`: `npm run check:documents` OK (tabel documents + bucket ofissio-documents reachable), `embroidery_pricing_zones.upper_back`/`center_back` `max_width_cm=30` live, dan CHECK `design_approval_sheet_pdf`/`design_approval_sheet_ofissio` terkonfirmasi 2026-09-01 via dokumen live `DAS-PRO-2609-001` (status generated).

Migration files existing in Git are not proof that they were applied. Use the live checks and retain the SQL execution log/screenshot as release evidence.

