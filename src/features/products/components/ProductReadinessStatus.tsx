import { AlertTriangle, Box, CheckCircle2, CircleAlert } from "lucide-react";

import { AdminBadge } from "@/features/admin/components/AdminBadge";
import type {
  Product3DReadinessStatus,
  ProductReadiness,
  ProductReadinessIssue,
  ProductReadinessStatus,
} from "@/features/products/woocommerce/woocommerce-product-readiness";

export function ProductReadinessBadge({
  readiness,
}: {
  readiness: ProductReadiness;
}) {
  const tone = readiness.isVisibleInOfissio
    ? "success"
    : readiness.status === "invalid_3d_model"
      ? "danger"
      : "warning";
  return <AdminBadge tone={tone}>{readiness.statusLabel}</AdminBadge>;
}

export function Product3DStatusBadge({
  readiness,
}: {
  readiness: ProductReadiness;
}) {
  const tone =
    readiness.model3DStatus === "glb_invalid"
      ? "danger"
      : readiness.model3DStatus === "glb_missing"
        ? "warning"
        : "brand";
  return <AdminBadge tone={tone}>{readiness.model3DStatusLabel}</AdminBadge>;
}

export function ProductIssueSummary({
  issues,
  limit = 3,
}: {
  issues: ProductReadinessIssue[];
  limit?: number;
}) {
  if (issues.length === 0) {
    return <span className="font-semibold text-emerald-700">Semua field wajib lengkap</span>;
  }
  const visible = issues.slice(0, limit).map(shortIssueLabel);
  const remaining = issues.length - visible.length;
  return (
    <span className="leading-5 text-ink-muted">
      {visible.join(", ")}
      {remaining > 0 ? ` + ${remaining} lainnya` : ""}
    </span>
  );
}

export function ProductReadinessPanel({
  readiness,
}: {
  readiness: ProductReadiness;
}) {
  const valid = readiness.isVisibleInOfissio;
  return (
    <section
      className={
        valid
          ? "rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-soft-sm md:p-6"
          : "rounded-[1.75rem] border border-amber-200 bg-amber-50/85 p-5 shadow-soft-sm md:p-6"
      }
      aria-labelledby="product-readiness-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={
              valid
                ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 shadow-soft-xs"
                : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 shadow-soft-xs"
            }
          >
            {valid ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="type-eyebrow text-brand-700">Status Validasi Ofissio</p>
            <h2 id="product-readiness-heading" className="mt-1 text-xl font-black text-ink">
              {valid
                ? "Produk valid untuk Ofissio"
                : "Produk ini belum tampil di katalog Ofissio"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {valid
                ? "Produk akan tampil di katalog customer dan dapat direkomendasikan Ofistant."
                : "Lengkapi seluruh field blocking di bawah. Warning tidak menghalangi produk tampil."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProductReadinessBadge readiness={readiness} />
          <Product3DStatusBadge readiness={readiness} />
        </div>
      </div>

      {!valid ? (
        <div className="mt-5">
          <h3 className="text-sm font-black text-ink">Yang perlu dilengkapi</h3>
          <ul className="mt-3 grid gap-2 lg:grid-cols-2">
            {readiness.blockingIssues.map((issue) => (
              <IssueRow key={issue.field} issue={issue} tone="blocking" />
            ))}
          </ul>
        </div>
      ) : null}

      {readiness.warnings.length > 0 ? (
        <details className="mt-5 rounded-2xl border border-white/80 bg-white/75 p-4">
          <summary className="cursor-pointer text-sm font-black text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
            {readiness.warnings.length} warning non-blocking
          </summary>
          <ul className="mt-3 grid gap-2 lg:grid-cols-2">
            {readiness.warnings.map((issue) => (
              <IssueRow key={issue.field} issue={issue} tone="warning" />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function IssueRow({
  issue,
  tone,
}: {
  issue: ProductReadinessIssue;
  tone: "blocking" | "warning";
}) {
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-soft-xs">
      {tone === "blocking" ? (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
      ) : (
        <Box className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
      )}
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{issue.label}</span>
        <span className="mt-1 block text-xs font-semibold text-brand-700">{issue.action}</span>
      </span>
    </li>
  );
}

function shortIssueLabel(issue: ProductReadinessIssue) {
  const labels: Record<string, string> = {
    status: "Status publish",
    sku: "SKU",
    price: "Harga",
    categories: "Kategori",
    industries: "Industri",
    has_3d_model: "Status 3D",
    model_3d: "GLB",
    model_3d_id: "ID model",
    model_3d_version: "Versi model",
    model_3d_source: "Sumber model",
    model_3d_filename: "Nama file model",
    moq: "MOQ",
    lead_time: "Lead time",
    fulfillment_type: "Fulfillment",
    transaction_mode: "Transaction mode",
  };
  return labels[issue.field] ?? issue.label;
}

export function readinessStatusTone(status: ProductReadinessStatus) {
  if (status === "valid") return "success" as const;
  if (status === "invalid_3d_model") return "danger" as const;
  return "warning" as const;
}

export function model3DStatusTone(status: Product3DReadinessStatus) {
  if (status === "glb_invalid") return "danger" as const;
  if (status === "glb_missing") return "warning" as const;
  return "brand" as const;
}
