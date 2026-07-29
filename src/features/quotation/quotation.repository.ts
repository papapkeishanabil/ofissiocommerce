import "server-only";

import { repositoryRegistry } from "@/features/repositories/repository.factory";

export const quotationRepository = repositoryRegistry.quotations;
