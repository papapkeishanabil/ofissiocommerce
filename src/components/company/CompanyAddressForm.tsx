// src/components/company/CompanyAddressForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { addressSchema, type AddressForm as AddressValues } from "@/schemas/auth";
import { addAddress } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { genId } from "@/lib/mock/storage";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

interface CompanyAddressFormProps {
  onSuccess?: () => void;
}

export function CompanyAddressForm({ onSuccess }: CompanyAddressFormProps) {
  const refresh = useAuthStore((s) => s.refresh);
  const session = useAuthStore((s) => s.session);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register: field,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      recipientName: session?.user.fullName ?? "",
      recipientPhone: session?.user.whatsapp ?? "",
      street: "",
      city: "",
      province: "",
      postalCode: "",
      isDefaultShipping: false,
      isDefaultBilling: false,
    },
  });

  const isDefaultShipping = watch("isDefaultShipping");

  const onSubmit = handleSubmit((values) => {
    if (!session) return;
    setSubmitting(true);
    setServerError(null);
    const next = addAddress(session.company.id, {
      id: genId("addr"),
      label: values.label,
      recipientName: values.recipientName,
      recipientPhone: values.recipientPhone,
      street: values.street,
      city: values.city,
      province: values.province,
      postalCode: values.postalCode,
      isDefaultShipping: !!values.isDefaultShipping,
      isDefaultBilling: !!values.isDefaultBilling,
    });
    setSubmitting(false);
    if (!next) {
      setServerError("Gagal menambah alamat.");
      return;
    }
    refresh();
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Label Alamat"
          htmlFor="addr-label"
          required
          error={errors.label?.message}
        >
          <Input id="addr-label" placeholder="cth: Kantor Pusat" {...field("label")} />
        </Field>
        <Field
          label="Nama Penerima"
          htmlFor="addr-recipient"
          required
          error={errors.recipientName?.message}
        >
          <Input id="addr-recipient" {...field("recipientName")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Telepon Penerima"
          htmlFor="addr-phone"
          required
          error={errors.recipientPhone?.message}
        >
          <Input id="addr-phone" placeholder="0812xxxx" {...field("recipientPhone")} />
        </Field>
        <Field
          label="Kode Pos"
          htmlFor="addr-pos"
          required
          error={errors.postalCode?.message}
        >
          <Input id="addr-pos" maxLength={5} placeholder="12345" {...field("postalCode")} />
        </Field>
      </div>

      <Field
        label="Alamat Jalan"
        htmlFor="addr-street"
        required
        error={errors.street?.message}
      >
        <Input
          id="addr-street"
          placeholder="Jl. Contoh No. 123, RT 01/RW 02"
          {...field("street")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Kota"
          htmlFor="addr-city"
          required
          error={errors.city?.message}
        >
          <Input id="addr-city" {...field("city")} />
        </Field>
        <Field
          label="Provinsi"
          htmlFor="addr-province"
          required
          error={errors.province?.message}
        >
          <Input id="addr-province" {...field("province")} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line"
            {...field("isDefaultShipping")}
            onChange={(e) => setValue("isDefaultShipping", e.target.checked)}
          />
          Jadikan alamat pengiriman utama
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line"
            {...field("isDefaultBilling")}
            onChange={(e) => setValue("isDefaultBilling", e.target.checked)}
          />
          Jadikan alamat penagihan utama
        </label>
      </div>

      {isDefaultShipping && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-[11px] text-brand-800">
          Alamat pengiriman lain akan dinonaktifkan sebagai default secara otomatis.
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Menyimpan..." : "Tambah Alamat"}
      </Button>
    </form>
  );
}
