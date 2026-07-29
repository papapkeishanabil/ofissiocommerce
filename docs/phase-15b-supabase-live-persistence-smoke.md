# Phase 15B — Supabase Live Persistence Smoke Test

Status: passed on local staging runtime.

## Runtime tested

- `DATABASE_PROVIDER=supabase`
- `STORAGE_PROVIDER=mock`
- `AUTH_PROVIDER=mock`
- `EMAIL_PROVIDER=mock`
- `EMAIL_ENABLED=false`
- Dev server: `http://localhost:8000`

Secrets were not printed during validation. `.env.local` and staging env files must remain untracked.

## Verified

- `/api/health` returns:
  - `databaseProvider: "supabase"`
  - `databaseStatus: "connected"`
  - `schemaStatus: "ready"`
  - `missingTables: []`
- `npm run check:supabase` confirms all required Supabase tables are reachable.
- Quotation request persists into `quotations`.
- Quotation line items persist into `quotation_items`.
- Mock email logs persist into `email_logs`.
- Upload metadata persists into `uploaded_files`.
- Company logo metadata persists into `company_logos`.
- Dashboard quotation list reads Supabase records.
- Quotation detail reads Supabase records.
- Company isolation rejects cross-company quotation/file access with safe 403/404.
- Cart, shipping mock, payment mock, and tracking still work.
- KK-006 still uses `/3d/kk-006.glb`.
- 3D configurator canvas still opens.
- Browser smoke test produced zero console errors.
- Mobile product page has no horizontal overflow.

## Scripts added

```bash
npm run test:company-isolation
npm run verify:supabase-persistence
```

`test:company-isolation` creates dummy records prefixed with `PHASE15B_TEST_` and does not delete existing data.

`verify:supabase-persistence` reports table existence, count, and latest `created_at` for persistence tables without printing secrets.

## Known limitations

- Binary object storage is still mock.
- Supabase Storage is not active yet.
- Auth is still mock.
- RLS still needs a full staging security review before production.
- Payment remains mock.
- Shipping remains mock/manual.
- WooCommerce live was not tested.
- Email real delivery is not active.
- Existing npm audit vulnerabilities were not fixed in this phase.
