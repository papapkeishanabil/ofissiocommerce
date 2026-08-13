-- Official Ofissio Bordir Work Order (BWO) PDF support.
-- Run manually in Supabase SQL Editor before generating BWO documents.

alter table documents drop constraint if exists documents_document_type_check;
alter table documents add constraint documents_document_type_check check (
  document_type in (
    'quotation_pdf',
    'invoice_pdf',
    'embroidery_work_order_pdf',
    'production_work_order_pdf',
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
    'production_work_order_ofissio'
  )
);

create index if not exists idx_documents_embroidery_work_order
  on documents(company_id, entity_id, generated_at desc)
  where document_type = 'embroidery_work_order_pdf';
