export const EMAIL_TYPES = [
  "quotation_request_sales",
  "quotation_confirmation_customer",
  "payment_received_customer",
  "order_tracking_update_customer",
  "upload_notification_internal",
  "test_email",
] as const;

export type EmailType = (typeof EMAIL_TYPES)[number];

export const EMAIL_STATUSES = [
  "queued",
  "sent",
  "failed",
  "skipped",
  "mocked",
] as const;

export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export type EmailProvider = "mock" | "resend";

export interface EmailRuntimeConfig {
  requestedProvider: EmailProvider;
  provider: EmailProvider;
  enabled: boolean;
  from: string;
  replyTo: string | null;
  salesQuotationEmail: string | null;
  resendConfigured: boolean;
}

export interface EmailSendInput {
  type: EmailType;
  companyId: string | null;
  userId: string | null;
  to: string[];
  from?: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  safeMetadata?: Record<string, unknown>;
  request?: Request;
}

export interface EmailSendResult {
  id: string;
  provider: EmailProvider;
  status: EmailStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
}

export interface EmailLog {
  id: string;
  companyId: string | null;
  userId: string | null;
  to: string[];
  from: string;
  replyTo: string | null;
  subject: string;
  type: EmailType;
  provider: EmailProvider;
  status: EmailStatus;
  providerMessageId: string | null;
  safeMetadata: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailProviderAdapter {
  name: EmailProvider;
  send(input: {
    to: string[];
    from: string;
    replyTo: string | null;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ providerMessageId: string | null }>;
}
