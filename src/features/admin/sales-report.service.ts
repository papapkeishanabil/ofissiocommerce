import "server-only";
import { aggregatePaidProductSales, isFullyPaidOrder } from "@/features/products/paid-product-sales";
import { productServerService } from "@/features/products/product.server-service";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import type { PaymentOrderRecord, PaymentRecord } from "@/features/payment/payment.types";

import { listAdminOrders } from "./admin.service";
import { buildSalesDashboard, salesPeriodRange } from "./sales-dashboard";

/** Status yang menghapus order dari perhitungan penjualan booked. */
const INVALID_ORDER_STATUSES = new Set(["cancelled", "payment_failed"]);
const PAID_ORDER_STATUS = "payment_received";

export interface SalesReportPeriod {
  /** YYYY-MM-DD inklusif */
  from: string;
  /** YYYY-MM-DD inklusif */
  to: string;
  category?: string;
  target?: number;
}

export interface SalesReportSummary {
  orderCount: number;
  bookedCount: number;
  paidCount: number;
  cancelledCount: number;
  failedCount: number;
  waitingCount: number;
  bookedValue: number;
  paidValue: number;
  cancelledValue: number;
  failedValue: number;
  /** Pesanan batal + gagal dibanding seluruh order periode (0..1). */
  cancelRate: number;
}

export interface SalesMonthRow {
  /** Kunci bulan YYYY-MM */
  month: string;
  bookedValue: number;
  paidValue: number;
  receivableValue: number;
}

export interface SalesCustomerRow {
  companyId: string;
  companyName: string;
  orderCount: number;
  bookedValue: number;
  paidValue: number;
}

export interface SalesProductRow {
  productId: string;
  paidValue: number;
  productName: string;
  sku: string;
  qty: number;
  orderCount: number;
  bookedValue: number;
}

export interface SalesReportOrderRow {
  id: string;
  orderNumber: string;
  companyId: string;
  companyName: string;
  orderStatus: string;
  booked: boolean;
  paid: boolean;
  total: number;
  createdAt: string;
}

export interface SalesReport {
  dashboard: ReturnType<typeof buildSalesDashboard>;
  period: SalesReportPeriod;
  summary: SalesReportSummary;
  /** Piutang berjalan saat ini: order valid yang belum lunas, semua periode. */
  receivableOutstanding: { count: number; value: number };
  /** Daftar piutang terurut dari yang tertua + ringkasan aging. */
  receivables: SalesReceivables;
  /** Tren 12 bulan terakhir berdasarkan bulan order dibuat. */
  months: SalesMonthRow[];
  topCustomers: SalesCustomerRow[];
  topProducts: SalesProductRow[];
  orders: SalesReportOrderRow[];
}

export type SalesAgingBucket = "0-30" | "31-60" | "60+";
export type SalesReceivableLinkStatus = "aktif" | "expired" | "belum_dibuat";

export interface SalesReceivableRow {
  id: string;
  orderNumber: string;
  companyId: string;
  companyName: string;
  total: number;
  createdAt: string;
  /** Hari sejak order dibuat sampai sekarang. */
  ageDays: number;
  bucket: SalesAgingBucket;
  linkStatus: SalesReceivableLinkStatus;
}

export interface SalesReceivables {
  /** Order belum lunas, terurut dari umur terlama — prioritas follow-up. */
  rows: SalesReceivableRow[];
  buckets: { bucket: SalesAgingBucket; count: number; value: number }[];
}

export function isValidBookedOrder(order: { status: string }) {
  return !INVALID_ORDER_STATUSES.has(order.status);
}

function periodRange({ from, to }: SalesReportPeriod) {
  return salesPeriodRange({ from, to });
}

function inRange(iso: string, range: { start: number; end: number }) {
  const time = Date.parse(iso);
  return Number.isFinite(time) && time >= range.start && time < range.end;
}

export async function getSalesReport(period: SalesReportPeriod): Promise<SalesReport> {
  const range = periodRange(period);
  if (!range) throw new Error("Periode laporan tidak valid.");
  const [adminOrders, rawOrders, products] = await Promise.all([
    listAdminOrders(),
    (repositoryRegistry.orders.listAll?.() ?? Promise.resolve([])) as Promise<PaymentOrderRecord[]>,
    productServerService.getPublishedProducts(),
  ]);

  const summary: SalesReportSummary = {
    orderCount: 0,
    bookedCount: 0,
    paidCount: 0,
    cancelledCount: 0,
    failedCount: 0,
    waitingCount: 0,
    bookedValue: 0,
    paidValue: 0,
    cancelledValue: 0,
    failedValue: 0,
    cancelRate: 0,
  };
  const orders: SalesReportOrderRow[] = [];
  const rawById = new Map(rawOrders.map(order => [order.id, order]));
  const reportAdminOrders = adminOrders.map(row => {
    const raw = rawById.get(row.id);
    return raw?.status === PAID_ORDER_STATUS && !isFullyPaidOrder(raw)
      ? { ...row, orderStatus: "deposit_paid" } : row;
  });

  if (range) {
    for (const row of reportAdminOrders) {
      if (!inRange(row.createdAt, range)) continue;
      const booked = isValidBookedOrder({ status: row.orderStatus });
      const paid = row.orderStatus === PAID_ORDER_STATUS;
      summary.orderCount += 1;
      if (booked) summary.bookedCount += 1;
      if (paid) summary.paidCount += 1;
      if (row.orderStatus === "cancelled") summary.cancelledCount += 1;
      if (row.orderStatus === "payment_failed") summary.failedCount += 1;
      if (["waiting_payment", "deposit_paid"].includes(row.orderStatus)) summary.waitingCount += 1;
      if (booked) summary.bookedValue += row.total;
      if (paid) summary.paidValue += row.total;
      if (row.orderStatus === "cancelled") summary.cancelledValue += row.total;
      if (row.orderStatus === "payment_failed") summary.failedValue += row.total;
      orders.push({
        id: row.id,
        orderNumber: row.orderNumber,
        companyId: row.companyId,
        companyName: row.companyName,
        orderStatus: row.orderStatus,
        booked,
        paid,
        total: row.total,
        createdAt: row.createdAt,
      });
    }
  }
  summary.cancelRate = summary.orderCount
    ? (summary.cancelledCount + summary.failedCount) / summary.orderCount
    : 0;

  const receivables = await buildReceivables(reportAdminOrders, rawById);
  const receivableOutstanding = {
    count: receivables.rows.length,
    value: receivables.rows.reduce((total, row) => total + row.total, 0),
  };

  return {
    dashboard: buildSalesDashboard(rawOrders, period, {
      target: period.target,
      categoryProductIds: period.category ? new Set(products.filter(product => product.categorySlugs?.includes(period.category!)).map(product => product.id)) : undefined,
    }),
    period,
    summary,
    receivableOutstanding,
    receivables,
    months: buildMonthlyTrend(rawOrders),
    topCustomers: buildTopCustomers(orders, range),
    topProducts: aggregatePaidProductSales(rawOrders, period)
      .filter(row => !period.category || products.some(product => product.id === row.productId && product.categorySlugs?.includes(period.category!)))
      .map(row => ({ ...row, bookedValue: row.paidValue })),
    orders: orders.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  };
}

const AGING_BUCKETS = ["0-30", "31-60", "60+"] as const;

function agingBucket(ageDays: number): SalesAgingBucket {
  if (ageDays <= 30) return "0-30";
  if (ageDays <= 60) return "31-60";
  return "60+";
}

/** Status link pembayaran terakhir order: dipakai CS untuk follow-up.
 *  "expired" berarti link tidak bisa dibayar lagi (expired/gagal/batal) dan
 *  perlu dibuat ulang dari detail order. */
function resolveLinkStatus(latestPayment: PaymentRecord | null): SalesReceivableLinkStatus {
  if (!latestPayment) return "belum_dibuat";
  if (["expired", "failed", "cancelled"].includes(latestPayment.status)) return "expired";
  if (latestPayment.expiredAt && Date.parse(latestPayment.expiredAt) <= Date.now()) {
    return "expired";
  }
  return "aktif";
}

async function buildReceivables(
  adminOrders: Awaited<ReturnType<typeof listAdminOrders>>,
  rawById: Map<string, PaymentOrderRecord>,
): Promise<SalesReceivables> {
  const now = Date.now();
  const unpaid = adminOrders
    .filter((row) => ["waiting_payment", "deposit_paid"].includes(row.orderStatus))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const rows = await Promise.all(
    unpaid.map(async (row) => {
      const attempts =
        (await repositoryRegistry.payments.listPaymentsByOrder?.({
          companyId: row.companyId,
          orderId: row.id,
        })) ?? [];
      const latestPayment =
        attempts.length > 1
          ? attempts.reduce((latest, current) =>
              Date.parse(current.createdAt) > Date.parse(latest.createdAt) ? current : latest,
            )
          : (attempts[0] ?? null);
      const ageDays = Math.max(
        0,
        Math.floor((now - Date.parse(row.createdAt)) / 86_400_000),
      );
      return {
        id: row.id,
        orderNumber: row.orderNumber,
        companyId: row.companyId,
        companyName: row.companyName,
        total: row.orderStatus === "deposit_paid" ? rawById.get(row.id)?.paymentTerms?.balanceAmount ?? row.total : row.total,
        createdAt: row.createdAt,
        ageDays,
        bucket: agingBucket(ageDays),
        linkStatus: resolveLinkStatus(latestPayment),
      } satisfies SalesReceivableRow;
    }),
  );

  return {
    rows,
    buckets: AGING_BUCKETS.map((bucket) => {
      const inBucket = rows.filter((row) => row.bucket === bucket);
      return {
        bucket,
        count: inBucket.length,
        value: inBucket.reduce((total, row) => total + row.total, 0),
      };
    }),
  };
}

function buildMonthlyTrend(orders: PaymentOrderRecord[]): SalesMonthRow[] {
  const now = new Date(Date.now() + 7 * 3_600_000);
  const months: SalesMonthRow[] = [];
  const keys = new Map<string, SalesMonthRow>();
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const month = date.toISOString().slice(0, 7);
    const row: SalesMonthRow = { month, bookedValue: 0, paidValue: 0, receivableValue: 0 };
    months.push(row);
    keys.set(month, row);
  }
  for (const order of orders) {
    const time = Date.parse(order.createdAt);
    if (!Number.isFinite(time)) continue;
    const row = keys.get(new Date(time + 7 * 3_600_000).toISOString().slice(0, 7));
    if (!row) continue;
    const total = order.calculation.grandTotal;
    if (!isValidBookedOrder(order)) continue;
    row.bookedValue += total;
    if (isFullyPaidOrder(order)) {
      row.paidValue += total;
    } else {
      row.receivableValue += order.status === PAID_ORDER_STATUS && order.paymentTerms?.mode === "deposit_balance" ? order.paymentTerms.balanceAmount : total;
    }
  }
  return months;
}

function buildTopCustomers(
  orders: SalesReportOrderRow[],
  range: { start: number; end: number } | null,
): SalesCustomerRow[] {
  if (!range) return [];
  const byCompany = new Map<string, SalesCustomerRow>();
  for (const order of orders) {
    if (!order.booked) continue;
    const existing = byCompany.get(order.companyId) ?? {
      companyId: order.companyId,
      companyName: order.companyName,
      orderCount: 0,
      bookedValue: 0,
      paidValue: 0,
    };
    existing.orderCount += 1;
    existing.bookedValue += order.total;
    if (order.paid) existing.paidValue += order.total;
    byCompany.set(order.companyId, existing);
  }
  return [...byCompany.values()]
    .sort((a, b) => b.bookedValue - a.bookedValue)
    .slice(0, 5);
}

export function formatSalesMonthLabel(month: string) {
  const [year, monthPart] = month.split("-");
  const date = new Date(Date.UTC(Number(year), Number(monthPart) - 1, 1));
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** CSV per-order untuk export; selalu diawali BOM agar Excel membaca UTF-8. */
export function salesReportCsv(report: SalesReport) {
  const header = [
    "Tanggal",
    "Order",
    "Customer",
    "Status",
    "Masuk Booked",
    "Lunas",
    "Nilai (IDR)",
  ];
  const escape = (value: string | number | boolean) => {
    const text = typeof value === "string" && /^[\s]*[=+@-]/.test(value) ? `'${value}` : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = report.orders.map((order) =>
    [
      new Date(Date.parse(order.createdAt) + 7 * 3_600_000).toISOString().slice(0, 10),
      order.orderNumber,
      order.companyName,
      order.orderStatus,
      order.booked ? "Ya" : "Tidak",
      order.paid ? "Ya" : "Tidak",
      order.total,
    ]
      .map(escape)
      .join(","),
  );
  const summaryRows = [
    ["", ""],
    ["Ringkasan", `${report.period.from} s.d. ${report.period.to}`],
    ["Nilai booked", report.summary.bookedValue],
    ["Omzet lunas", report.summary.paidValue],
    ["Piutang berjalan", report.receivableOutstanding.value],
    ["Order", report.summary.orderCount],
    ["Batal/gagal", report.summary.cancelledCount + report.summary.failedCount],
  ].map((row) => row.map(escape).join(","));
  const receivableIntro = ["", "Piutang & tindak lanjut (semua periode, terurut tertua)"];
  const receivableHeader = [
    "Order",
    "Customer",
    "Umur (hari)",
    "Bucket",
    "Link pembayaran",
    "Nilai (IDR)",
  ];
  const receivableLines = report.receivables.rows.map((row) =>
    [row.orderNumber, row.companyName, row.ageDays, row.bucket, row.linkStatus, row.total]
      .map(escape)
      .join(","),
  );
  const dashboard = report.dashboard;
  const comparisonRows = [
    ["Perbandingan (seluruh kategori; tanggal order WIB)", "Periode ini", "Periode sebelumnya", "Perubahan (%)"],
    ["Periode", `${report.period.from} s.d. ${report.period.to}`, `${dashboard.previousPeriod.from} s.d. ${dashboard.previousPeriod.to}`, ""],
    ["Omzet lunas", dashboard.current.paidValue, dashboard.previous.paidValue, dashboard.revenueChange.percent ?? "Tidak dapat dihitung: periode sebelumnya nol"],
    ["Order lunas", dashboard.current.paidCount, dashboard.previous.paidCount, dashboard.paidOrdersChange.percent ?? "Tidak dapat dihitung: periode sebelumnya nol"],
    ["Rata-rata nilai order lunas", dashboard.current.averageOrderValue ?? "Belum ada order lunas", dashboard.previous.averageOrderValue ?? "Belum ada order lunas", dashboard.averageOrderChange?.percent ?? "Belum dapat dibandingkan"],
    ["Target omzet per laporan (belum disimpan sebagai target bersama)", dashboard.target?.value ?? "Belum ditetapkan"],
    ["Pencapaian target (%)", dashboard.target?.percent ?? "Belum ditetapkan"],
    ["Sisa target", dashboard.target?.remaining ?? "Belum ditetapkan"],
    ["Produk menurun; kategori", report.period.category || "Semua"],
    ["Produk", "SKU", "Unit sebelumnya", "Unit periode ini", "Selisih unit", "Perubahan (%)"],
    ...dashboard.decliningProducts.map(row => [row.productName, row.sku, row.previousQty, row.currentQty, row.difference, row.percent ?? ""]),
  ].map(row => row.map(escape).join(","));
  return [
    header.join(","),
    ...lines,
    ...summaryRows,
    ...comparisonRows,
    ["Produk lunas (unit terbanyak); kategori", report.period.category || "Semua"].map(escape).join(","),
    ["Produk", "SKU", "Unit lunas", "Jumlah order", "Nilai produk lunas"].join(","),
    ...report.topProducts.map(row => [row.productName, row.sku, row.qty, row.orderCount, row.paidValue].map(escape).join(",")),
    receivableIntro.map(escape).join(","),
    receivableHeader.join(","),
    ...receivableLines,
  ].join("\n");
}
