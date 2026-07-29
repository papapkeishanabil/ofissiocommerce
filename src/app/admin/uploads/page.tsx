import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { listAdminUploads } from "@/features/admin/admin.service";
import { formatAdminDate, formatFileSize } from "@/features/admin/admin.utils";

export default async function AdminUploadsPage() {
  const uploads = await listAdminUploads();
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
          Uploads / Logos
        </p>
        <h2 className="mt-1 text-2xl font-black text-ink">Customer uploaded file metadata</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Storage key dan service role tidak ditampilkan. Preview lama bisa unavailable saat storage mock restart.
        </p>
      </section>
      {uploads.length === 0 ? (
        <AdminEmptyState title="Belum ada upload" />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-soft-sm">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-ink-muted">
              <tr>
                <th className="px-4 py-3">File ID</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">MIME</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {uploads.map((file) => (
                <tr key={file.id} className="align-top">
                  <td className="px-4 py-3 break-all font-mono text-xs font-bold text-ink">{file.id}</td>
                  <td className="px-4 py-3 break-all text-ink-muted">{file.companyId}</td>
                  <td className="px-4 py-3">{file.fileType}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{file.originalFilename}</div>
                    <div className="text-xs text-ink-muted">{file.safeFilename}</div>
                  </td>
                  <td className="px-4 py-3">{file.mimeType}</td>
                  <td className="px-4 py-3">{formatFileSize(file.sizeBytes)}</td>
                  <td className="px-4 py-3"><AdminBadge tone={adminStatusTone(file.status)}>{file.status}</AdminBadge></td>
                  <td className="px-4 py-3">{formatAdminDate(file.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
