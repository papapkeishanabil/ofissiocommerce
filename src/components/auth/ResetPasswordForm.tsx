"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
  resetPasswordFormSchema,
  type ResetPasswordForm as ResetPasswordValues,
} from "@/schemas/auth";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("type") === "recovery" ? hash.get("access_token") : null;
    setToken(accessToken);
    setTokenReady(true);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setServerError(payload.message ?? "Password belum dapat diperbarui.");
        return;
      }
      setToken(null);
      setComplete(true);
    } catch {
      setServerError("Layanan pemulihan belum dapat dihubungi.");
    } finally {
      setSubmitting(false);
    }
  });

  if (!tokenReady) {
    return <p role="status" className="text-sm text-ink-subtle">Memvalidasi tautan pemulihan...</p>;
  }
  if (complete) {
    return (
      <div className="space-y-5">
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
          <CheckCircle2 aria-hidden="true" className="mb-3 h-6 w-6 text-emerald-600" />
          <p className="font-bold">Password berhasil diperbarui.</p>
          <p>Silakan masuk kembali menggunakan password baru Anda.</p>
        </div>
        <ButtonLink href="/login" className="w-full">Masuk ke akun</ButtonLink>
      </div>
    );
  }
  if (!token) {
    return (
      <div className="space-y-5">
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <AlertTriangle aria-hidden="true" className="mb-3 h-6 w-6 text-amber-600" />
          <p className="font-bold">Tautan pemulihan tidak valid atau sudah kedaluwarsa.</p>
          <p>Mintalah tautan baru untuk melanjutkan.</p>
        </div>
        <ButtonLink href="/forgot-password" className="w-full">Minta tautan baru</ButtonLink>
        <Link href="/login" className="block min-h-11 text-center text-sm font-semibold leading-[44px] text-brand-700 hover:underline">Kembali ke login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {serverError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div> : null}
      <Field label="Password baru" htmlFor="new-password" required error={errors.password?.message} hint="Minimal 8 karakter.">
        <PasswordInput id="new-password" autoComplete="new-password" autoFocus {...register("password")} />
      </Field>
      <Field label="Konfirmasi password" htmlFor="confirm-new-password" required error={errors.confirmPassword?.message}>
        <PasswordInput id="confirm-new-password" autoComplete="new-password" {...register("confirmPassword")} />
      </Field>
      <Button type="submit" className="w-full" disabled={submitting} aria-busy={submitting}>
        {submitting ? "Memperbarui..." : "Simpan password baru"}
      </Button>
    </form>
  );
}
