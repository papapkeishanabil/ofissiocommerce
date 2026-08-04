// src/components/auth/RegisterForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  registerSchema,
  type RegisterForm as RegisterFormValues,
} from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Input } from "@/components/ui/Input";

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const registerUser = useAuthStore((s) => s.register);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      whatsapp: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    setServerSuccess(null);
    const r = await registerUser({
      fullName: values.fullName,
      email: values.email,
      whatsapp: values.whatsapp,
      password: values.password,
    });
    setSubmitting(false);
    if (!r.ok) {
      setServerError(r.reason ?? "Pendaftaran gagal.");
      return;
    }
    if (r.requiresEmailVerification) {
      setServerSuccess("Akun dibuat. Periksa email Anda untuk verifikasi sebelum login.");
      return;
    }
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {serverError}
        </div>
      )}
      {serverSuccess && (
        <div role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {serverSuccess}
        </div>
      )}

      <div className="rounded-lg bg-brand-50 px-3 py-2 text-[11px] leading-snug text-brand-800">
        Pengguna pertama yang mendaftar otomatis menjadi <strong>Admin Perusahaan</strong>.
      </div>

      <Field
        label="Nama Lengkap"
        htmlFor="reg-name"
        required
        error={errors.fullName?.message}
      >
        <Input
          id="reg-name"
          autoComplete="name"
          placeholder="cth: Budi Santoso"
          {...field("fullName")}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="reg-email"
        required
        error={errors.email?.message}
      >
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="nama@perusahaan.com"
          {...field("email")}
        />
      </Field>

      <Field
        label="WhatsApp"
        htmlFor="reg-wa"
        required
        error={errors.whatsapp?.message}
      >
        <Input
          id="reg-wa"
          type="tel"
          autoComplete="tel"
          placeholder="0812xxxx1234"
          {...field("whatsapp")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="reg-password"
        required
        hint="Minimal 8 karakter (standar B2B)."
        error={errors.password?.message}
      >
        <PasswordInput
          id="reg-password"
          autoComplete="new-password"
          placeholder="••••••••"
          {...field("password")}
        />
      </Field>

      <Field
        label="Konfirmasi Password"
        htmlFor="reg-confirm"
        required
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          id="reg-confirm"
          autoComplete="new-password"
          placeholder="••••••••"
          {...field("confirmPassword")}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Memproses..." : "Daftar"}
      </Button>

      {onSwitchToLogin && (
        <p className="text-center text-xs text-ink-muted">
          Sudah punya akun?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-brand-700 hover:underline"
          >
            Masuk
          </button>
        </p>
      )}
    </form>
  );
}
