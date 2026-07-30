# Phase 23 - iPaymu Payment Link + QR Code + Callback Integration

Status: foundation implemented, live/staging credential activation pending.

## Implemented

- iPaymu runtime config with mock fallback.
- iPaymu request signature foundation.
- iPaymu callback signature validation foundation.
- Payment link creation service for cart checkout and existing admin order.
- Payment data model extension.
- `payment_events` migration draft.
- Admin payment panel on order detail.
- Customer payment panel on order tracking.
- Return/cancel/success/failed pages that do not mark paid.
- `check:payment`.
- Invoice payment block reads payment URL, reference, expiry, unique code, QR metadata.
- Email template foundation for invoice ready and payment received.

## Manual migration

Run manually in Supabase SQL Editor before enabling iPaymu staging:

`database/migrations/008_ipaymu_payment.sql`

## Known limitations

- QR image is not yet embedded into PDF because the internal PDF renderer does not support image streams.
- iPaymu sandbox create-payment is skipped unless env credentials are present.
- Refund/dispute workflow not included.
- Shipping remains mock/manual.
- WooCommerce live sync remains optional.
- Auth production still mock.

## Validation target

- `npm run check:payment`
- `npm run check:documents`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run check:all`
