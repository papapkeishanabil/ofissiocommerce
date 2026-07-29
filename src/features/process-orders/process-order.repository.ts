import "server-only";

import { repositoryRegistry } from "@/features/repositories/repository.factory";

export function getProcessOrderRepository() {
  return repositoryRegistry.processOrders;
}
