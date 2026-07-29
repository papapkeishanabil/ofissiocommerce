import "server-only";

import { randomUUID } from "node:crypto";

import type { CompanyLogoRegistration } from "@/features/company-assets/company-assets.types";
import type { CompanyLogoRepository } from "../repository.types";

type CompanyAssetsGlobal = typeof globalThis & {
  __ofissioCompanyLogos?: Map<string, CompanyLogoRegistration>;
};

const assetsGlobal = globalThis as CompanyAssetsGlobal;
const companyLogos =
  assetsGlobal.__ofissioCompanyLogos ??
  (assetsGlobal.__ofissioCompanyLogos = new Map<string, CompanyLogoRegistration>());

export const mockCompanyLogoRepository: CompanyLogoRepository = {
  async create(input) {
    const now = new Date().toISOString();
    const existing = [...companyLogos.values()].find(
      (logo) =>
        logo.companyId === input.companyId &&
        logo.fileId === input.fileId &&
        logo.status === "active",
    );
    if (existing) return existing;
    const logo: CompanyLogoRegistration = {
      id: `logo_${randomUUID()}`,
      companyId: input.companyId,
      fileId: input.fileId,
      label: input.label,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    companyLogos.set(logo.id, logo);
    return logo;
  },

  async listByCompany(companyId) {
    return [...companyLogos.values()]
      .filter((logo) => logo.companyId === companyId && logo.status === "active")
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async getById(input) {
    const logo = companyLogos.get(input.logoId);
    if (!logo || logo.companyId !== input.companyId || logo.status === "deleted") {
      return null;
    }
    return logo;
  },

  async softDelete(input) {
    const logo = await this.getById(input);
    if (!logo) return null;
    const next: CompanyLogoRegistration = {
      ...logo,
      status: "deleted",
      updatedAt: new Date().toISOString(),
    };
    companyLogos.set(next.id, next);
    return next;
  },
};
