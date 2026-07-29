import "server-only";

import type { CompanyRepository } from "../repository.types";

export const mockCompanyRepository: CompanyRepository = {
  async getCompanyById() {
    return null;
  },
  async listAll() {
    return [];
  },
};
