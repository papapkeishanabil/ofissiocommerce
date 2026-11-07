import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import { aggregatePaidProductSales, isFullyPaidOrder } from "@/features/products/paid-product-sales";

export interface DashboardPeriod { from: string; to: string }
const DAY = 86_400_000;
const WIB = 7 * 3_600_000;

function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(`${value}T00:00:00+07:00`);
  return Number.isFinite(time) && new Date(time + WIB).toISOString().slice(0, 10) === value ? time : NaN;
}

export function salesPeriodRange(period: DashboardPeriod) {
  const start = parseDay(period.from);
  const end = parseDay(period.to) + DAY;
  return Number.isFinite(start) && Number.isFinite(end) && start < end ? { start, end } : null;
}

export function previousSalesPeriod(period: DashboardPeriod): DashboardPeriod | null {
  const range = salesPeriodRange(period);
  if (!range) return null;
  const iso = (time: number) => new Date(time + WIB).toISOString().slice(0, 10);
  return { from: iso(range.start - (range.end - range.start)), to: iso(range.start - DAY) };
}

/** A zero baseline has no meaningful percentage growth. */
export function salesChange(current: number, previous: number) {
  return { difference: current - previous, percent: previous > 0 ? ((current - previous) / previous) * 100 : null };
}

export function parseSalesTarget(value: string | undefined | null) {
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) throw new Error("Target omzet harus berupa rupiah bulat positif.");
  const target = Number(value);
  if (!Number.isSafeInteger(target) || target <= 0) throw new Error("Target omzet harus berupa rupiah bulat positif.");
  return target;
}

export function buildSalesDashboard(
  orders: PaymentOrderRecord[], period: DashboardPeriod,
  options: { categoryProductIds?: Set<string>; target?: number } = {},
) {
  const previousPeriod = previousSalesPeriod(period);
  const range = salesPeriodRange(period);
  if (!range || !previousPeriod) throw new Error("Pilih rentang tanggal yang valid; tanggal akhir harus setelah atau sama dengan tanggal awal.");
  if (options.target !== undefined) parseSalesTarget(String(options.target));
  const summarize = (selected: DashboardPeriod) => {
    const bounds = salesPeriodRange(selected)!;
    let paidCount = 0;
    let paidValue = 0;
    const seen = new Set<string>();
    for (const order of orders) {
      const time = Date.parse(order.createdAt);
      if (seen.has(order.id) || !isFullyPaidOrder(order) || !(time >= bounds.start && time < bounds.end)) continue;
      seen.add(order.id);
      paidCount += 1;
      paidValue += order.calculation.grandTotal;
    }
    const paidUnits = aggregatePaidProductSales(orders, selected).reduce((total, product) => total + product.qty, 0);
    return { paidCount, paidValue, paidUnits, averageOrderValue: paidCount ? paidValue / paidCount : null };
  };
  const current = summarize(period);
  const previous = summarize(previousPeriod);
  const currentProducts = aggregatePaidProductSales(orders, period);
  const currentQty = new Map(currentProducts.map(row => [row.productId, row.qty]));
  const decliningProducts = aggregatePaidProductSales(orders, previousPeriod)
    .filter(row => !options.categoryProductIds || options.categoryProductIds.has(row.productId))
    .map(row => ({ ...row, previousQty: row.qty, currentQty: currentQty.get(row.productId) ?? 0,
      ...salesChange(currentQty.get(row.productId) ?? 0, row.qty) }))
    .filter(row => row.difference < 0)
    .sort((a, b) => a.difference - b.difference || a.productId.localeCompare(b.productId));
  return {
    previousPeriod, current, previous,
    revenueChange: salesChange(current.paidValue, previous.paidValue),
    paidOrdersChange: salesChange(current.paidCount, previous.paidCount),
    paidUnitsChange: salesChange(current.paidUnits, previous.paidUnits),
    averageOrderChange: current.averageOrderValue !== null && previous.averageOrderValue !== null
      ? salesChange(current.averageOrderValue, previous.averageOrderValue) : null,
    decliningProducts,
    target: options.target === undefined ? null : {
      value: options.target, percent: (current.paidValue / options.target) * 100,
      remaining: Math.max(0, options.target - current.paidValue),
    },
  };
}
