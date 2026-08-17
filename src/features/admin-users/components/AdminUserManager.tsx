"use client";

import { useState, useTransition } from "react";
import { Headphones, ShieldCheck, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { ManagedInternalRole, ManagedInternalUser } from "../admin-user.types";
import { MANAGED_ROLE_OPTIONS } from "../admin-user.types";

const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AdminUserManager({ initialUsers }: { initialUsers: ManagedInternalUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function createUser(formData: FormData) {
    setMessage(null); setError(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          role: String(formData.get("role") ?? "sales"),
        }),
      });
      const payload = await response.json().catch(() => ({})) as { user?: ManagedInternalUser; message?: string };
      if (!response.ok || !payload.user) { setError(payload.message ?? "User belum dapat dibuat."); return; }
      setUsers((current) => [payload.user!, ...current]);
      setMessage(`Akun ${payload.user.name} berhasil dibuat dan dapat langsung login.`);
      const form = document.getElementById("create-internal-user") as HTMLFormElement | null;
      form?.reset();
    });
  }

  function updateUser(id: string, patch: { role?: ManagedInternalRole; status?: "active" | "inactive" }) {
    setMessage(null); setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await response.json().catch(() => ({})) as { user?: ManagedInternalUser; message?: string };
      if (!response.ok || !payload.user) { setError(payload.message ?? "User belum dapat diperbarui."); return; }
      setUsers((current) => current.map((user) => user.id === id ? payload.user! : user));
      setMessage("Hak akses user berhasil diperbarui.");
    });
  }

  return <div className="space-y-6">
    <section className="grid gap-4 md:grid-cols-2">
      {MANAGED_ROLE_OPTIONS.map((role) => <article key={role.value} className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${role.value === "sales" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
            {role.value === "sales" ? <Headphones className="h-5 w-5" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div><h2 className="font-black text-ink">{role.label}</h2><p className="mt-1 text-sm leading-6 text-ink-muted">{role.responsibility}</p><span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Rute {role.routes}</span></div>
        </div>
      </article>)}
    </section>

    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm">
      <div className="flex items-center gap-3"><UserPlus className="h-5 w-5 text-brand-700" aria-hidden="true" /><div><h2 className="font-black text-ink">Tambah user Ofissio</h2><p className="text-sm text-ink-muted">Buat akun login internal dengan tanggung jawab yang sudah dibatasi.</p></div></div>
      <form id="create-internal-user" action={createUser} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Nama lengkap"><input name="name" required minLength={2} className={INPUT} autoComplete="name" /></Field>
        <Field label="Email Ofissio"><input name="email" type="email" required className={INPUT} autoComplete="email" /></Field>
        <Field label="Password sementara" hint="Minimal 10 karakter. Sampaikan secara aman."><input name="password" type="password" required minLength={10} className={INPUT} autoComplete="new-password" /></Field>
        <Field label="Peran"><select name="role" defaultValue="sales" className={INPUT}>{MANAGED_ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label} · {role.routes}</option>)}</select></Field>
        <div className="md:col-span-2 xl:col-span-4"><Button type="submit" disabled={pending} aria-busy={pending}><UserPlus className="h-4 w-4" aria-hidden="true" />{pending ? "Menyimpan..." : "Buat akun internal"}</Button></div>
      </form>
      {message ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </section>

    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft-sm">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4"><Users className="h-5 w-5 text-brand-700" aria-hidden="true" /><div><h2 className="font-black text-ink">Daftar tim internal</h2><p className="text-sm text-ink-muted">Nonaktifkan akun ketika staf tidak lagi bertugas.</p></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-subtle"><tr><th className="px-5 py-3">User</th><th className="px-4 py-3">Peran</th><th className="px-4 py-3">Rute utama</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Tindakan</th></tr></thead><tbody className="divide-y divide-line">
        {users.map((user) => { const option = MANAGED_ROLE_OPTIONS.find((role) => role.value === user.role); const manageable = Boolean(option); return <tr key={user.id} className="align-middle"><td className="px-5 py-4"><p className="font-bold text-ink">{user.name}</p><p className="text-xs text-ink-muted">{user.email}</p></td><td className="px-4 py-4">{manageable ? <select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value as ManagedInternalRole })} disabled={pending || user.status !== "active"} className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm font-semibold">{MANAGED_ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select> : <span className="font-semibold capitalize">{user.role.replaceAll("_", " ")}</span>}</td><td className="px-4 py-4 font-bold text-brand-700">{option?.routes ?? "Semua / sistem"}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{user.status === "active" ? "Aktif" : "Nonaktif"}</span></td><td className="px-5 py-4 text-right">{manageable ? <button type="button" disabled={pending} onClick={() => updateUser(user.id, { status: user.status === "active" ? "inactive" : "active" })} className="min-h-10 rounded-lg border border-line px-3 text-xs font-bold text-ink hover:border-brand-200 hover:text-brand-700 disabled:opacity-50">{user.status === "active" ? "Nonaktifkan" : "Aktifkan"}</button> : <span className="text-xs text-ink-muted">Dikelola sistem</span>}</td></tr>; })}
      </tbody></table></div>
    </section>
  </div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-ink">{label}{children}{hint ? <span className="mt-1 block text-xs font-normal text-ink-muted">{hint}</span> : null}</label>;
}
