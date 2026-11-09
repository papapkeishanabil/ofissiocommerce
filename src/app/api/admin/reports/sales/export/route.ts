import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getSalesReport, salesReportCsv } from "@/features/admin/sales-report.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseSalesTarget } from "@/features/admin/sales-dashboard";

export const runtime = "nodejs";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  try {
    requireInternalAdmin(request, "admin:order:view");
    const query = new URL(request.url).searchParams;
    const from = query.get("from") ?? "";
    const to = query.get("to") ?? "";
    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      return safeErrorResponse(
        new Error("Parameter from/to harus berformat YYYY-MM-DD."),
        "Parameter periode tidak valid.",
        400,
      );
    }
    const report = await getSalesReport({ from, to, category: query.get("category") || undefined, target: parseSalesTarget(query.get("target")) });
    return new Response(`﻿${salesReportCsv(report)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ofissio-sales-report-${from}_sd_${to}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return safeErrorResponse(error, "Laporan penjualan belum dapat dibuat.", 400);
  }
}
