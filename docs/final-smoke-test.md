# Final staging smoke test

Run on the exact release candidate against production-like staging. Record order/quotation IDs without copying customer secrets or private artwork into this document.

## Customer flow

- [ ] Register, confirm email, and login.
- [ ] Browse catalog; customer sees no stock quantity or out-of-stock blocker.
- [ ] Open product detail and the valid GLB/3D viewer.
- [ ] Upload a permitted logo and verify company isolation.
- [ ] Configure size/customization and request quotation.
- [ ] Open the emailed final quotation/PDF and accept it.
- [ ] View the converted order and invoice.
- [ ] Open the iPaymu payment link/QR; browser return does not mark the order paid.
- [ ] A valid sandbox callback updates payment/tracking exactly once.

## Admin flow

- [ ] Login through the isolated admin shell.
- [ ] Review product readiness, variation SKU, and admin-only stock.
- [ ] Review quotation, pricing/tax, send quote, and confirm email log.
- [ ] Convert accepted quotation idempotently.
- [ ] Generate and send invoice with the matching backend amount.
- [ ] Verify payment status and order workbench instructions.
- [ ] Create/open the correct fulfillment, customization, or production process order.
- [ ] Complete process tasks and verify customer-friendly tracking.
- [ ] Detect a stock shortage and create an idempotent replenishment request.
- [ ] Get a Biteship rate and create a shipment.
- [ ] Receive a valid webhook, waybill/tracking update, and delivered status.

## Security flow

- [ ] Anonymous requests to admin APIs return 401/403.
- [ ] Customer sessions cannot call admin APIs.
- [ ] Cross-company quotation/order/file/profile access is denied.
- [ ] Invalid iPaymu signature/reference/amount is denied or sent to manual review, never paid.
- [ ] Invalid Biteship webhook secret/signature is denied.
- [ ] Duplicate payment callback and shipping webhook are idempotent.
- [ ] Internal notes, storage keys, provider payloads, and secrets are absent from customer responses/client bundles.

## Responsive and browser evidence

- [ ] Critical customer flow passes on desktop and mobile.
- [ ] Critical admin flow passes on desktop and has no mobile horizontal overflow.
- [ ] Browser console has zero application errors.
- [ ] 3D viewer can be opened repeatedly without an uncaught WebGL error.

## Sign-off

- Release SHA:
- Staging URL:
- Tester/date:
- Customer quotation/order IDs:
- Payment transaction reference:
- Shipment reference:
- Result: `PASS` / `FAIL`
- Evidence links:
- Notes:

