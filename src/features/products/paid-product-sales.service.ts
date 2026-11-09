import "server-only";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { aggregatePaidProductSales } from "./paid-product-sales";

export async function getPaidProductSales() {
  if (!repositoryRegistry.orders.listAll) throw new Error("Data penjualan tidak tersedia.");
  return aggregatePaidProductSales(await repositoryRegistry.orders.listAll());
}
