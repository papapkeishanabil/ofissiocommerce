import "server-only";

import { getRepositoryProvider } from "./repository.config";
import type { RepositoryRegistry } from "./repository.types";
import { mockAuditRepository } from "./mock/mock-audit.repository";
import { mockCompanyRepository } from "./mock/mock-company.repository";
import { mockCompanyLogoRepository } from "./mock/mock-company-logo.repository";
import { mockEmailLogRepository } from "./mock/mock-email-log.repository";
import { mockDocumentRepository } from "./mock/mock-document.repository";
import { mockOrderRepository } from "./mock/mock-order.repository";
import { mockPaymentRepository } from "./mock/mock-payment.repository";
import { mockProcessOrderRepository } from "./mock/mock-process-order.repository";
import { mockQuotationRepository } from "./mock/mock-quotation.repository";
import { mockShipmentRepository } from "./mock/mock-shipment.repository";
import { mockTrackingRepository } from "./mock/mock-tracking.repository";
import { mockUploadedFileRepository } from "./mock/mock-uploaded-file.repository";
import { mockUserRepository } from "./mock/mock-user.repository";
import { supabaseAuditRepository } from "./supabase/supabase-audit.repository";
import { supabaseCompanyRepository } from "./supabase/supabase-company.repository";
import { supabaseCompanyLogoRepository } from "./supabase/supabase-company-logo.repository";
import { supabaseEmailLogRepository } from "./supabase/supabase-email-log.repository";
import { supabaseDocumentRepository } from "./supabase/supabase-document.repository";
import { supabaseOrderRepository } from "./supabase/supabase-order.repository";
import { supabasePaymentRepository } from "./supabase/supabase-payment.repository";
import { supabaseProcessOrderRepository } from "./supabase/supabase-process-order.repository";
import { supabaseQuotationRepository } from "./supabase/supabase-quotation.repository";
import { supabaseShipmentRepository } from "./supabase/supabase-shipment.repository";
import { supabaseTrackingRepository } from "./supabase/supabase-tracking.repository";
import { supabaseUploadedFileRepository } from "./supabase/supabase-uploaded-file.repository";
import { supabaseUserRepository } from "./supabase/supabase-user.repository";

export function createRepositoryRegistry(): RepositoryRegistry {
  const provider = getRepositoryProvider();
  const isSupabase = provider === "supabase";
  return {
    provider,
    company: isSupabase ? supabaseCompanyRepository : mockCompanyRepository,
    companyUsers: isSupabase ? supabaseUserRepository : mockUserRepository,
    carts: {
      async getActiveCart() {
        return null;
      },
      async saveCart() {
        return null;
      },
    },
    orders: isSupabase ? supabaseOrderRepository : mockOrderRepository,
    payments: isSupabase ? supabasePaymentRepository : mockPaymentRepository,
    tracking: isSupabase ? supabaseTrackingRepository : mockTrackingRepository,
    auditLogs: isSupabase ? supabaseAuditRepository : mockAuditRepository,
    uploadedFiles: isSupabase ? supabaseUploadedFileRepository : mockUploadedFileRepository,
    companyLogos: isSupabase ? supabaseCompanyLogoRepository : mockCompanyLogoRepository,
    quotations: isSupabase ? supabaseQuotationRepository : mockQuotationRepository,
    emailLogs: isSupabase ? supabaseEmailLogRepository : mockEmailLogRepository,
    processOrders: isSupabase ? supabaseProcessOrderRepository : mockProcessOrderRepository,
    documents: isSupabase ? supabaseDocumentRepository : mockDocumentRepository,
    shipments: isSupabase ? supabaseShipmentRepository : mockShipmentRepository,
  };
}

export const repositoryRegistry = createRepositoryRegistry();
