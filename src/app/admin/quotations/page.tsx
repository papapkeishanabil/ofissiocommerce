import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import {
  ADMIN_TABLE_CLASS,
  AdminPageHeader,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";
import { listAdminQuotations } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminQuotationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const quotations = await listAdminQuotations({ status, search });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin quotations"
        title="Request quotation B2B"
        description="Membaca data dari quotation repository/Supabase. Filter ini server-side ringan, aman untuk review sales dan convert order foundation."
        actions={
          <form className="flex flex-col gap-2 sm:flex-row" action="/admin/quotations">
          <input
            name="search"
            defaultValue={search}
            placeholder="Cari company / nomor"
            className="h-11 rounded-full border border-line bg-white px-4 text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-11 rounded-full border border-line bg-white px-4 text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          >
            <option value="">Semua status</option>
            <option value="submitted">Submitted</option>
            <option value="emailed">Emailed</option>
            <option value="under_review">Under review</option>
            <option value="quoted">Quoted</option>
            <option value="revision_requested">Revision requested</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button type="submit" size="sm">Filter</Button>
        </form>
        }
      />

      {quotations.length === 0 ? (
        <AdminEmptyState title="Quotation belum ada" />
      ) : (
        <AdminTableShell>
          <table className={`${ADMIN_TABLE_CLASS} min-w-[920px]`}>
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3">Quotation</th>
                <th className="px-4 py-3">Company / PIC</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((quotation) => (
                <tr key={quotation.id} className="align-top">
                  <td className="px-4 py-3 font-bold text-ink">{quotation.quotationNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{quotation.companyName}</div>
                    <div className="text-xs text-ink-muted">{quotation.picName} · {quotation.picEmail ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={adminStatusTone(quotation.status)}>{quotation.status}</AdminBadge>
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={adminStatusTone(quotation.emailStatus)}>{quotation.emailStatus}</AdminBadge>
                  </td>
                  <td className="px-4 py-3">{quotation.itemCount}</td>
                  <td className="px-4 py-3">{quotation.totalQty} pcs</td>
                  <td className="px-4 py-3">{formatAdminDate(quotation.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/quotations/${quotation.id}`} className="font-bold text-brand-700">
                      View Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      )}
    </div>
  );
}
