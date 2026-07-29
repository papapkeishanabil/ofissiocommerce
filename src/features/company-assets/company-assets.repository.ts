import "server-only";

import { randomUUID } from "node:crypto";

import type { CompanyLogoRegistration } from "./company-assets.types";

type CompanyAssetsGlobal = typeof globalThis & {
  __ofissioCompanyLogos?: Map<string, CompanyLogoRegistration>;
};

const assetsGlobal = globalThis as CompanyAssetsGlobal;
const companyLogos =
  assetsGlobal.__ofissioCompanyLogos ??
  (assetsGlobal.__ofissioCompanyLogos = new Map<string, CompanyLogoRegistration>());

export const companyLogoRepository = {
  create(input: { companyId: string; fileId: string; label: string }) {
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

  listByCompany(companyId: string) {
    return [...companyLogos.values()]
      .filter((logo) => logo.companyId === companyId && logo.status === "active")
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  getById(input: { companyId: string; logoId: string }) {
    const logo = companyLogos.get(input.logoId);
    if (!logo || logo.companyId !== input.companyId || logo.status === "deleted") {
      return null;
    }
    return logo;
  },

  softDelete(input: { companyId: string; logoId: string }) {
    const logo = this.getById(input);
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
