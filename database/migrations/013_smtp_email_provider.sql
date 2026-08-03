-- Task B.1: allow Hostinger SMTP delivery and internal order notification logs.
-- Safe to run after the existing email_logs migrations.

alter table email_logs
  drop constraint if exists email_logs_provider_check;

alter table email_logs
  add constraint email_logs_provider_check
  check (provider in ('mock', 'resend', 'smtp'));

alter table email_logs
  drop constraint if exists email_logs_type_check;

alter table email_logs
  add constraint email_logs_type_check
  check (
    type in (
      'quotation_request_sales',
      'quotation_confirmation_customer',
      'quotation_ready_customer',
      'payment_received_customer',
      'order_tracking_update_customer',
      'upload_notification_internal',
      'order_created_internal',
      'test_email'
    )
  );
