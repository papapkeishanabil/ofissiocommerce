import Link from "next/link";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { listAdminCustomers } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminCustomersPage() {
  const customers = await listAdminCustomers();
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
          Customers
        </p>
        <h2 className="mt-1 text-2xl font-black text-ink">Company operational overview</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Menggabungkan company table dan jejak operasional quotation/order/upload.
        </p>
      </section>
      {customers.length === 0 ? (
        <AdminEmptyState title="Belum ada company" />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-soft-sm">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-ink-muted">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Quotations</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((customer) => (
                <tr key={customer.companyId}>
                  <td className="px-4 py-3">
                    <div className="font-bold text-ink">{customer.companyName}</div>
                    <div className="break-all text-xs text-ink-muted">{customer.companyId}</div>
                  </td>
                  <td className="px-4 py-3">{customer.industry ?? "-"}</td>
                  <td className="px-4 py-3">{customer.employeeCount ?? "-"}</td>
                  <td className="px-4 py-3"><AdminBadge tone={adminStatusTone(customer.status)}>{customer.status}</AdminBadge></td>
                  <td className="px-4 py-3">{customer.userCount}</td>
                  <td className="px-4 py-3">{customer.quotationCount}</td>
                  <td className="px-4 py-3">{customer.orderCount}</td>
                  <td className="px-4 py-3">{formatAdminDate(customer.createdAt)}</td>
                  <td className="px-4 py-3"><Link href={`/admin/customers/${customer.companyId}`} className="font-bold text-brand-700">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
