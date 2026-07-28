# Phase 7: Security Hardening

Phase 7 menambahkan security foundation sebelum WooCommerce Headless dan production readiness. Scope fase ini sengaja tidak membuat auth provider production, database production, Redis production, iPaymu live, shipping provider real, atau admin panel penuh.

## Security layers implemented

- Mock auth guard: `requireAuth()`, `getCurrentUserMock()`, `requireMockSession()`, `requireAdminPlaceholder()`.
- RBAC helper: `requireRole()`, `canCheckout()`, `canViewPayment()`, `canViewOrder()`, `canApproveArtwork()`, `canRequestQuotation()`.
- Internal role map untuk production/admin phase berikutnya.
- Company isolation: `requireCompanyAccess()`, `assertSameCompany()`, `filterByCompanyId()`, `getScopedCompanyId()`.
- API validation helper untuk body/query.
- In-memory rate limit helper.
- Safe error response helper.
- Server-only secret helper.
- Upload security foundation.
- In-memory audit log foundation.
- Security headers via Next config.

## Endpoints hardened

- `POST /api/checkout/cart`
- `POST /api/payment/ipaymu/create`
- `POST /api/payment/ipaymu/callback`
- `POST /api/payment/mock/complete`
- `GET /api/payment/status`
- `POST /api/shipping/rates`
- `POST /api/shipping/create-shipment`
- `GET /api/shipping/track`
- `GET /api/tracking/orders`
- `GET /api/tracking/orders/[id]`
- `POST /api/security/audit`
- 3D helper endpoints receive validation/rate-limit/safe errors:
  - `POST /api/3d/meshy/create`
  - `GET /api/3d/meshy/poll`
  - `POST /api/3d/tripo/create`
  - `GET /api/3d/tripo/poll`

## Payment security review

- Payment create still recalculates totals server-side from validated checkout cart.
- Mock payment completion checks company ownership before status mutation.
- Payment status requires company/session scope.
- iPaymu callback validates payload and remains fail-closed because signature live is intentionally not guessed.
- Callback amount/reference/idempotency checks remain in the webhook processor.
- Provider payload stored as a limited safe snapshot.
- Invalid callback is audited.

## Shipping security review

- Shipping rates require scoped customer session.
- Backend canonical weight remains authoritative.
- Destination/item payloads are Zod validated.
- Rate limit is applied at route level and existing provider-level throttling remains.
- Shipment records now carry `companyId` for tracking isolation.
- Provider errors are returned as safe public messages.

## Ofistant boundary

Ofistant action dispatcher now scopes `OPEN_ORDER_TRACKING` to the active company. Requested order IDs that do not belong to the current company are ignored in favor of the company-scoped latest order/dashboard fallback.

## Known limitation

- Mock auth still trusts client-provided `companyId/userId`; production must replace it.
- Rate limit and audit log are in-memory and reset on server restart.
- Payment/shipping providers are still mock/foundation.
- Upload validation helper is ready but production upload endpoint/storage is not implemented yet.
- CSP is intentionally dev-friendly and must be tightened after final external domains are known.
- Client-side mock stores are still used in several demo flows.

## Manual test checklist

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`
4. `/catalog` shows KK-006.
5. `/product/kemeja-kantor-kk-006` opens product detail.
6. Preview 3D opens canvas.
7. `/3d/kk-006.glb` returns 200.
8. Checkout can check shipping rates.
9. Mock payment success still works.
10. Payment success creates tracking.
11. `/dashboard` shows checkout order.
12. `/orders/[id]` opens checkout order.
13. Ofistant opens latest active tracking order.
14. Tracking with different `companyId` returns safe 403/404.
15. Invalid payment status does not reveal internals.
16. Invalid shipping request returns safe error.
17. Static chunks do not expose server secrets.
18. Error response does not include stack trace.

## Before production

- Implement real server auth/session.
- Persist checkout/payment/shipping/tracking/audit data.
- Replace in-memory rate limiting with Redis/edge store.
- Implement official iPaymu signature verification.
- Add signed/private storage, antivirus, SVG sanitize.
- Finalize WooCommerce Headless secret handling.
