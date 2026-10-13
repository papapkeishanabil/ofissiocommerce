import { mapQuotationToTracking } from "@/features/quotation/quotation.mapper";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import { getDashboardTrackingSnapshot } from "./tracking.service";
import type { CustomerTrackingOrder } from "./tracking.types";

export async function loadCustomerTrackingSnapshot(input: {
  companyId: string;
  companyName: string;
  userId: string;
  signal: AbortSignal;
  fetcher?: typeof fetch;
}) {
  if (!input.companyId || !input.userId) {
    throw new Error("Sesi customer belum tersedia.");
  }
  const fetcher = input.fetcher ?? fetch;
  const signal = AbortSignal.any([input.signal, AbortSignal.timeout(30_000)]);
  const params = new URLSearchParams({
    companyId: input.companyId,
    companyName: input.companyName,
    userId: input.userId,
  });

  async function readList<T>(url: string, field: string): Promise<T[]> {
    const response = await fetcher(url, { cache: "no-store", signal });
    if (!response.ok) throw new Error("Data akun belum dapat dimuat.");
    const body = await response.json() as Record<string, unknown>;
    if (body.ok !== true || !Array.isArray(body[field])) {
      throw new Error("Respons data akun tidak sesuai.");
    }
    return body[field] as T[];
  }

  const [orders, quotations] = await Promise.all([
    readList<CustomerTrackingOrder>(`/api/tracking/orders?${params}`, "dynamicOrders"),
    readList<QuotationRequestRecord>(`/api/quotation?${params}`, "quotations"),
  ]);
  return getDashboardTrackingSnapshot(
    { companyId: input.companyId, companyName: input.companyName },
    orders,
    quotations.map(mapQuotationToTracking),
  );
}
