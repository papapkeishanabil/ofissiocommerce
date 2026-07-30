import "server-only";

import { repositoryRegistry } from "@/features/repositories/repository.factory";

export const uploadedFileRepository = repositoryRegistry.uploadedFiles;
