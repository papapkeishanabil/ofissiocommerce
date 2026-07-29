import "server-only";

import { getRepositoryProvider } from "./repository.config";
import type { RepositoryRegistry } from "./repository.types";

function notMigrated(entity: string): never {
  throw new Error(`${entity} database repository belum dimigrasikan pada Phase 11.`);
}

export function createRepositoryRegistry(): RepositoryRegistry {
  const provider = getRepositoryProvider();
  return {
    provider,
    company: {
      async getCompanyById() {
        return null;
      },
    },
    companyUsers: {
      async getCompanyUser() {
        return null;
      },
    },
    carts: {
      async getActiveCart() {
        return null;
      },
      async saveCart() {
        return notMigrated("Cart");
      },
    },
    orders: {
      async getOrderById() {
        return null;
      },
      async listOrdersByCompany() {
        return [];
      },
    },
    payments: {
      async getPaymentById() {
        return null;
      },
      async getPaymentByReference() {
        return null;
      },
    },
    tracking: {
      async getTrackingByOrderId() {
        return null;
      },
      async listTrackingByCompany() {
        return [];
      },
    },
    auditLogs: {
      async writeAuditLog() {
        // Existing in-memory audit log remains the active implementation.
      },
    },
    uploadedFiles: {
      async getFileById() {
        return null;
      },
    },
  };
}

export const repositoryRegistry = createRepositoryRegistry();
