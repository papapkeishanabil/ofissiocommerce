-- Ofissio migration 016: full-custom quotation entry without catalog/cart.
-- Run manually in Supabase SQL Editor before enabling the live custom request UI.

alter table quotations
  drop constraint if exists quotations_source_check;

alter table quotations
  add constraint quotations_source_check
  check (source in ('web_cart', 'custom_request'));

comment on column quotations.source is
  'web_cart for catalog/cart requests; custom_request for full-custom project briefs.';
