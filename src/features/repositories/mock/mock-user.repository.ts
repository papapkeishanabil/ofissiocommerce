import "server-only";

import type { UserCompanyRepository } from "../repository.types";

export const mockUserRepository: UserCompanyRepository = {
  async getCompanyUser() {
    return null;
  },
};
