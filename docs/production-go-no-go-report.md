# Production Go/No-Go report

Audit date: 8 August 2026  
Release candidate: `v0.1.0-rc1` (not created)  
Audited base commit: `3fb96a1` plus Task J working-tree changes

## Decision

- **Staging: CONDITIONAL_GO.** Automated checks may run and sandbox end-to-end testing may continue.
- **Live production: NO_GO.** Do not enable real customer traffic, real payment, or real shipping yet.

The staging decision is conditional because the active environment still uses iPaymu and Biteship sandbox, WooCommerce test write is enabled, legal approval is not recorded, and operational restore/alert evidence is not complete. A successful build alone does not change this decision.

## Go/No-Go matrix

| Area | Automated status | Live-production status | Evidence / remaining gate |
| --- | --- | --- | --- |
| Auth production | PASS | Conditional | `check:auth`; first production super-admin and real email-verification smoke remain release evidence. |
| RLS/security | PASS | Conditional | `check:rls` validates live enabled + forced RLS, API guards, private buckets, callbacks, and secret boundaries. External penetration/CSP review remains. |
| Supabase database | PASS | Ready | `check:supabase` and health schema check. Apply all release migrations to the target production project before cutover. |
| Supabase storage | PASS | Ready with smoke | `check:storage`; perform upload/download/delete and restore evidence on production-like staging. |
| WooCommerce | PASS | Conditional | Product/order/media endpoints are reachable. Disable test write before release. |
| Product readiness | WARN | Blocked for affected products | Products with incomplete variable-product/size variation metadata must be corrected or unpublished. |
| Stock admin monitoring | PASS with product warnings | Conditional | Customer stock visibility remains false; variation SKU/stock readiness must be complete for operational products. |
| iPaymu payment | PASS sandbox | **NO_GO live** | Sandbox foundation/callback checks pass. Live credential, public notify URL, real callback, amount reconciliation, and QR smoke are required. |
| Biteship shipping | PASS sandbox | **NO_GO live** | Sandbox foundation checks pass. Live credential, webhook, rate, create shipment, and tracking smoke are required. |
| SMTP/email | PASS foundation | Conditional | SMTP checker/service pass; SPF, DKIM, DMARC, bounce, and real recipient delivery evidence are required. |
| Invoice PDF | PASS foundation | Conditional | Document checks/build pass; verify final payment link/QR and approved company identity on release PDF. |
| Legal pages | PASS technical | **Blocked** | Four routes exist, but `LEGAL_REVIEW_APPROVED=true` has not been evidenced by business/legal approval. |
| Backup/restore | Documentation ready | **Blocked** | SOP exists; a dated staging restore drill and owner sign-off are still required. |
| Monitoring | Documentation ready | **Blocked** | Health endpoint/logging exist; external alert routing, owner, and escalation test are not evidenced. |
| Rollback | Documentation ready | Conditional | SOP exists; simulate rollback and record the last-known-good release before tagging. |

## Known blockers

1. iPaymu and Biteship are still sandbox, so live payment/shipping is not approved.
2. Legal content has not been marked as reviewed and approved.
3. Restore drill, alert delivery, escalation owner, and rollback simulation have no release evidence yet.
4. WooCommerce product-standard warnings remain for products without complete variable size/SKU metadata.
5. `WOOCOMMERCE_TEST_WRITE=true` is active in the current local/staging environment and must be `false` in production.

## Known warnings

- `STOCK_CUSTOMER_VISIBILITY` and `GINEE_TEST_LIVE` must be explicit `false` in production even when their runtime defaults are safe.
- The current working tree will be dirty while Task J documentation is uncommitted. A release tag must only be created from a reviewed, committed, clean tree.
- Automated provider checks do not replace a real external callback/webhook smoke test.

## Automated command evidence

All commands below completed with exit code 0 on 8 August 2026 unless a warning is stated:

| Command | Result |
| --- | --- |
| `npm run check:env` | PASS with expected development warning for iPaymu sandbox testing. |
| `npm run check:auth` | PASS; auth/RBAC/company-isolation and client secret checks pass. |
| `npm run check:supabase` | PASS; 23 required tables and required payment/shipment/profile columns reachable. |
| `npm run check:storage` | PASS; four configured buckets reachable and private; write smoke skipped. |
| `npm run check:rls` | PASS; 34 live tables enabled + forced, anonymous reads denied. |
| `npm run check:woocommerce` | PASS; two valid GLB products, product/order/media endpoints reachable, test order #35 reused idempotently. Product #17 is filtered because its primary image is missing. |
| `npm run check:woocommerce-stock` | PASS foundation; live KL-007 has one variation row and an SKU warning. |
| `npm run check:woocommerce-product-standard` | PASS foundation with live warning: KL-007 is not yet a variable product with the Ukuran variation matrix. |
| `npm run check:payment` | PASS sandbox hardening; no real transaction created because the test flag is false. |
| `npm run check:shipping` | PASS sandbox hardening/persistence; no real Biteship shipment created. |
| `npm run check:production-readiness` | **23 PASS, 6 WARN, 0 FAIL; CONDITIONAL_GO.** |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS, zero lint warnings/errors. |
| `npm run build` | PASS; 81 static pages generated and all dynamic routes compiled. |
| `npm run check:all` | PASS; includes email, documents, pricing, notifications, commercial flow, order sync, typecheck, lint, and a second production build. |

`check:email` skipped real delivery, `check:documents` skipped real PDF generation,
and storage skipped write smoke because their explicit test flags are false. These
skips are safe defaults, but the corresponding manual staging evidence is still
required before live production.

## Required production flags

```bash
STOCK_CUSTOMER_VISIBILITY=false
WOOCOMMERCE_TEST_WRITE=false
IPAYMU_TEST_CREATE_PAYMENT=false
BITESHIP_TEST_CREATE_SHIPMENT=false
GINEE_TEST_LIVE=false
LEGAL_REVIEW_APPROVED=true
```

## Final recommendation

**CONDITIONAL_GO for staging; NO_GO for live production.** Re-run the full command gate after the blockers are closed. A future `GO` requires zero `FAIL`, no unresolved production `WARN`, a clean Git tree, and signed manual smoke-test evidence.
