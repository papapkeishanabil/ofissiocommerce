// src/components/company/CompanyProfileForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  companyProfileSchema,
  type CompanyProfileForm as CompanyProfileValues,
} from "@/schemas/auth";
import { INDUSTRY_META } from "@/data/industries";
import { useAuthStore } from "@/stores/auth-store";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface CompanyProfileFormProps {
  onSuccess?: () => void;
}

export function CompanyProfileForm({ onSuccess }: CompanyProfileFormProps) {
  const refresh = useAuthStore((s) => s.refresh);
  const session = useAuthStore((s) => s.session);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const c = session?.company;
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyProfileValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: c?.companyName ?? "",
      industry: c?.industry ?? "",
      employeeCount: (c?.employeeCount ?? 0) || (0 as unknown as number),
      npwp: c?.npwp ?? "",
      phone: c?.phone ?? "",
      picName: c?.picName ?? "",
      picEmail: c?.picEmail ?? "",
      picWhatsapp: c?.picWhatsapp ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!session) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const response = await fetch("/api/company/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Gagal menyimpan profil perusahaan.");
      }
      await refresh();
      onSuccess?.();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan profil perusahaan.",
      );
    } finally {
      setSubmitting(false);
    }
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

      <Field
        label="Nama Perusahaan"
        htmlFor="co-name"
        required
        error={errors.companyName?.message}
      >
        <Input id="co-name" placeholder="PT Contoh Sukses" {...field("companyName")} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Industri"
          htmlFor="co-industry"
          required
          error={errors.industry?.message}
        >
          <Select id="co-industry" {...field("industry")}>
            <option value="">Pilih industri…</option>
            {INDUSTRY_META.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Jumlah Karyawan"
          htmlFor="co-emp"
          required
          error={errors.employeeCount?.message}
        >
          <Input
            id="co-emp"
            type="number"
            min={1}
            step={1}
            placeholder="cth: 150"
            {...field("employeeCount")}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Telepon Perusahaan"
          htmlFor="co-phone"
          required
          error={errors.phone?.message}
        >
          <Input id="co-phone" placeholder="021-1234567" {...field("phone")} />
        </Field>

        <Field
          label="NPWP (opsional)"
          htmlFor="co-npwp"
          hint="Diperlukan untuk faktur pajak."
          error={errors.npwp?.message}
        >
          <Input id="co-npwp" placeholder="XX.XXX.XXX.X-XXX.XXX" {...field("npwp")} />
        </Field>
      </div>

      <div className="rounded-lg bg-surface-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        Penanggung Jawab (PIC)
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Nama PIC"
          htmlFor="co-pic-name"
          required
          error={errors.picName?.message}
        >
          <Input id="co-pic-name" {...field("picName")} />
        </Field>
        <Field
          label="Email PIC"
          htmlFor="co-pic-email"
          required
          error={errors.picEmail?.message}
        >
          <Input id="co-pic-email" type="email" {...field("picEmail")} />
        </Field>
        <Field
          label="WhatsApp PIC"
          htmlFor="co-pic-wa"
          required
          error={errors.picWhatsapp?.message}
        >
          <Input id="co-pic-wa" placeholder="0812xxxx" {...field("picWhatsapp")} />
        </Field>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan Profil Perusahaan"}
      </Button>
    </form>
  );
}
