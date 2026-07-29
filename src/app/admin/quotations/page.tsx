import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
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
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-surface p-5 shadow-soft-sm md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
            Admin quotations
          </p>
          <h2 className="mt-1 text-2xl font-black text-ink">Request quotation B2B</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Membaca data dari quotation repository/Supabase. Filter ini server-side ringan.
          </p>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row" action="/admin/quotations">
          <input
            name="search"
            defaultValue={search}
            placeholder="Cari company / nomor"
            className="h-10 rounded-full border border-line bg-white px-4 text-sm outline-none focus:border-brand-500"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 rounded-full border border-line bg-white px-4 text-sm outline-none focus:border-brand-500"
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
      </section>

      {quotations.length === 0 ? (
        <AdminEmptyState title="Quotation belum ada" />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-soft-sm">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-ink-muted">
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
            <tbody className="divide-y divide-line">
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
        </div>
      )}
    </div>
  );
}
