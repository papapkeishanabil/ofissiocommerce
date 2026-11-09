"use client";

import { useEffect, useRef, useState } from "react";
import type { ManagedInternalUser } from "../admin-user.types";

const INPUT = "mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand-600";
const BUTTON = "min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function AdminUserEditor({ user, canChangePassword, onUpdated, onClose, onBusyChange }: {
  user: ManagedInternalUser; canChangePassword: boolean;
  onUpdated: (user: ManagedInternalUser) => void; onClose: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const nameInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { nameInput.current?.focus(); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>, password: boolean) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    if (password && values.get("password") !== values.get("confirmPassword")) { setError("Konfirmasi password tidak sama.");setMessage("");return; }
    setBusy(true);onBusyChange(true);setMessage("");setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}${password ? "/password" : ""}`, {
        method: password ? "POST" : "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password ? { password: values.get("password"), confirmPassword: values.get("confirmPassword") } : { name: values.get("name") }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "Perubahan belum dapat disimpan.");
      if (password) { form.reset();setMessage("Password berhasil diganti. Gunakan password baru untuk login berikutnya."); }
      else {
        if (!result.user) throw new Error("Data user belum tersedia. Muat ulang daftar.");
        onUpdated(result.user);if (nameInput.current) nameInput.current.value = result.user.name;setMessage("Nama user berhasil diperbarui.");
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Koneksi terputus. Coba kembali."); }
    finally { setBusy(false);onBusyChange(false); }
  }
  return <section aria-label={`Edit user ${user.email}`} className="space-y-5 rounded-xl bg-slate-50 p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-ink">Edit user</h3><p className="break-all text-sm text-ink-muted">{user.email}</p></div><button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-lg border border-line bg-white px-4 text-sm font-semibold disabled:opacity-50">Tutup editor</button></div>
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {busy && <p role="status" className="text-sm text-ink-muted">Menyimpan perubahan...</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={event => void submit(event, false)} className="space-y-3">
        <label className="block text-sm font-semibold text-ink">Nama lengkap<input ref={nameInput} name="name" defaultValue={user.name} required minLength={2} maxLength={120} disabled={busy} autoComplete="off" className={INPUT} /></label>
        <button type="submit" disabled={busy} className={BUTTON}>Simpan nama</button>
      </form>
      {canChangePassword ? <form onSubmit={event => void submit(event, true)} className="space-y-3">
        <label className="block text-sm font-semibold text-ink">Password baru<input name="password" type="password" required minLength={10} maxLength={128} disabled={busy} autoComplete="new-password" className={INPUT} /></label>
        <label className="block text-sm font-semibold text-ink">Konfirmasi password baru<input name="confirmPassword" type="password" required minLength={10} maxLength={128} disabled={busy} autoComplete="new-password" className={INPUT} /></label>
        <p className="text-xs text-ink-muted">Minimal 10 karakter. Password lama tidak ditampilkan. Sampaikan password baru secara aman kepada pemilik akun.</p>
        <button type="submit" disabled={busy} className={BUTTON}>Ganti password</button>
      </form> : <p className="text-sm text-ink-muted">Password Super Admin hanya dapat diubah oleh pemilik akun tersebut.</p>}
    </div>
  </section>;
}

export function AdminUserDeleteConfirm({ user, onDeleted, onClose, onBusyChange, onReload }: {
  user: ManagedInternalUser; onDeleted: () => void; onClose: () => void;
  onBusyChange: (busy: boolean) => void; onReload: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  async function remove(event: React.FormEvent) {
    event.preventDefault();
    if (busy || email.trim().toLowerCase() !== user.email.toLowerCase()) return;
    setBusy(true);onBusyChange(true);setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmEmail: email }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "User belum dapat dihapus.");
      onDeleted();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Koneksi terputus. Coba kembali.");
      await onReload().catch(() => undefined);
    } finally { setBusy(false);onBusyChange(false); }
  }
  return <section aria-label={`Konfirmasi hapus ${user.email}`} className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5">
    <h3 className="font-bold text-red-900">Hapus akun {user.name}?</h3>
    <p className="text-sm text-red-900">Akun login dihapus dan akses internal dicabut. Tindakan ini tidak dapat dibatalkan. Riwayat transaksi dan pekerjaan tidak ikut dihapus. Untuk penonaktifan sementara, pilih Batal lalu Nonaktifkan.</p>
    {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
    <form onSubmit={event => void remove(event)} className="space-y-3">
      <label className="block text-sm font-semibold text-ink">Ketik email user untuk konfirmasi<input ref={input} type="email" required value={email} disabled={busy} onChange={event => setEmail(event.target.value)} autoComplete="off" className={INPUT} /></label>
      <p className="break-all text-xs text-ink-muted">Email yang harus diketik: {user.email}</p>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-lg border border-line bg-white px-4 text-sm font-semibold disabled:opacity-50">Batal</button><button type="submit" disabled={busy || email.trim().toLowerCase() !== user.email.toLowerCase()} className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-40">{busy ? "Menghapus..." : "Hapus user permanen"}</button></div>
    </form>
  </section>;
}
