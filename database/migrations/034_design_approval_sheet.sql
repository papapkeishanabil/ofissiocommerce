-- Migration 034: Lembar Approval Desain (Design Approval Sheet)
--
-- 1) Tipe dokumen baru `design_approval_sheet_pdf` + template
--    `design_approval_sheet_ofissio` — keduanya dibatasi CHECK di tabel documents,
--    jadi constraint harus di-alter sebelum fitur PDF lembar approval aktif.
-- 2) Lebarkan batas maksimal bordir punggung agar kebutuhan nyata klien
--    (mis. nama klinik 27x7 cm) lolos validasi server:
--    upper_back  20 -> 30 cm (tinggi tetap 8)
--    center_back 25 -> 30 cm (tinggi tetap 20)
--    Sinkron dengan DEFAULT_EMBROIDERY_PRICING_ZONES di
--    src/features/products/embroidery-pricing.ts (jalur TS memakai alias
--    middle_back -> center_back via normalizeEmbroideryZoneId).

begin;

alter table documents drop constraint if exists documents_document_type_check;
alter table documents add constraint documents_document_type_check check (
  document_type in (
    'quotation_pdf',
    'invoice_pdf',
    'embroidery_work_order_pdf',
    'production_work_order_pdf',
    'design_approval_sheet_pdf',
    'production_order_pdf_future',
    'packing_slip_pdf_future'
  )
);

alter table documents drop constraint if exists documents_template_id_check;
alter table documents add constraint documents_template_id_check check (
  template_id in (
    'quotation_default',
    'invoice_default',
    'invoice_ofissio_custom',
    'embroidery_work_order_ofissio',
    'production_work_order_ofissio',
    'design_approval_sheet_ofissio'
  )
);

update embroidery_pricing_zones
  set max_width_cm = 30, updated_at = now()
  where zone_id in ('upper_back', 'center_back') and max_width_cm < 30;

commit;
