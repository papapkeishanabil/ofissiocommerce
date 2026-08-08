# Release checklist

Release candidate: `v0.1.0-rc1`  
Rule: do not tag or push until every required item is checked with evidence.

## Source and automated gates

- [ ] Git working tree is clean (`git status --short` has no output).
- [ ] The release commit has been reviewed and its SHA is recorded.
- [ ] All Task J command checks pass with no production `FAIL`.
- [ ] `npm run check:production-readiness` returns `GO` for `APP_ENV=production`.
- [ ] No `.env.local`, secret, debug artifact, or build cache is tracked.
- [ ] Client bundle secret scan passes after the final build.

## Database and environment

- [ ] All migrations in [migration-application-checklist.md](./migration-application-checklist.md) are applied to the target project.
- [ ] `npm run check:supabase`, `npm run check:storage`, and `npm run check:rls` pass against the target project.
- [ ] Production env is verified by two people and safe flags are explicit.
- [ ] First production `super_admin` exists, can sign in, and has no seeded/shared password.
- [ ] Backup is current and a staging restore drill has passed.

## External providers

- [ ] WooCommerce product/order/media read is connected to the intended environment.
- [ ] `WOOCOMMERCE_TEST_WRITE=false` and any write smoke order is documented.
- [ ] iPaymu live callback is received through the public HTTPS notify URL and duplicate/amount mismatch behavior is verified.
- [ ] Biteship live webhook, rate, create shipment, waybill, and tracking are verified.
- [ ] SMTP sender, SPF, DKIM, DMARC, reply-to, and bounce/failure handling are verified.

## Product, legal, and operations

- [ ] Every published product intended for launch passes product readiness.
- [ ] Customer stock visibility is verified absent in catalog, detail, cart, and checkout.
- [ ] Legal documents have business/legal sign-off and `LEGAL_REVIEW_APPROVED=true`.
- [ ] Final customer email and quotation/invoice PDF identity are approved.
- [ ] Monitoring alerts reach the named on-call owner.
- [ ] Rollback plan and last-known-good release are recorded.
- [ ] [final-smoke-test.md](./final-smoke-test.md) is signed off on desktop and mobile.

## Release approval record

- Release commit SHA:
- Staging URL:
- Database project:
- Business owner:
- Technical owner:
- Incident commander:
- Approved at:
- Decision: `GO` / `CONDITIONAL_GO` / `NO_GO`
- Accepted risks:
- Rollback tag:

## Manual release tag

Run only after approval and a clean working tree:

```bash
git tag -a v0.1.0-rc1 -m "Ofissio production readiness release candidate"
git show v0.1.0-rc1 --no-patch
git push origin v0.1.0-rc1
```

Task J does not create or push this tag automatically.

