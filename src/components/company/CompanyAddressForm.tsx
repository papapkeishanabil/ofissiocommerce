// src/components/company/CompanyAddressForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { addressSchema, type AddressForm as AddressValues } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import type { Address } from "@/types/account";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

interface CompanyAddressFormProps {
  address?: Address | null;
  onSuccess?: () => void;
  checkout?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export function CompanyAddressForm({ address, onSuccess, checkout = false, onDirtyChange }: CompanyAddressFormProps) {
  const refresh = useAuthStore((s) => s.refresh);
  const session = useAuthStore((s) => s.session);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register: field,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: address?.label ?? (checkout ? "Pengiriman" : ""),
      recipientName: address?.recipientName ?? session?.user.fullName ?? "",
      recipientPhone: address?.recipientPhone ?? session?.user.whatsapp ?? "",
      street: address?.street ?? "",
      city: address?.city ?? "",
      province: address?.province ?? "",
      postalCode: address?.postalCode ?? "",
      isDefaultShipping: address?.isDefaultShipping ?? checkout,
      isDefaultBilling: address?.isDefaultBilling ?? false,
    },
  });

  const isDefaultShipping = watch("isDefaultShipping");
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const onSubmit = handleSubmit(async (values) => {
    if (!session) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const response = await fetch(
        address
          ? `/api/company/addresses/${encodeURIComponent(address.id)}`
          : "/api/company/addresses",
        {
          method: address ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ??
            (address ? "Gagal memperbarui alamat." : "Gagal menambah alamat."),
        );
      }
      await refresh();
      reset(values);
      onSuccess?.();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : address
            ? "Gagal memperbarui alamat."
            : "Gagal menambah alamat.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (checkout) return (
    <form id="checkout-recipient" onSubmit={onSubmit} noValidate className="space-y-3">
      {serverError && <p role="alert" className="text-xs text-red-700">{serverError}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama penerima" htmlFor="recipient-name" error={errors.recipientName?.message}><Input id="recipient-name" autoComplete="name" placeholder="Contoh: Budi Santoso" {...field("recipientName")} /></Field>
        <Field label="Nomor telepon" htmlFor="recipient-phone" error={errors.recipientPhone?.message}><Input id="recipient-phone" autoComplete="tel" placeholder="Contoh: 0812 3456 7890" {...field("recipientPhone")} /></Field>
      </div>
      <Field label="Alamat" htmlFor="recipient-street" error={errors.street?.message}><textarea id="recipient-street" autoComplete="street-address" placeholder="Tulis alamat lengkap" {...field("street")} className="min-h-20 w-full rounded-lg border border-line bg-white p-3 text-sm" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kota" htmlFor="recipient-city" error={errors.city?.message}><Input id="recipient-city" autoComplete="address-level2" placeholder="Contoh: Jakarta" {...field("city")} /></Field>
        <Field label="Kode pos" htmlFor="recipient-postal" error={errors.postalCode?.message}><Input id="recipient-postal" autoComplete="postal-code" maxLength={5} placeholder="Contoh: 12345" {...field("postalCode")} /></Field>
      </div>
      <Field label="Provinsi" htmlFor="recipient-province" error={errors.province?.message}><Input id="recipient-province" autoComplete="address-level1" placeholder="Contoh: DKI Jakarta" {...field("province")} /></Field>
      <input type="hidden" {...field("label")} />
      {errors.label && <p role="alert" className="text-xs text-red-700">{errors.label.message}</p>}
      {(!address || isDirty) && <Button type="submit" variant="outline" disabled={submitting}>{submitting?"Menyimpan...":"Simpan informasi penerima"}</Button>}
    </form>
  );

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
        {submitting
          ? "Menyimpan..."
          : address
            ? "Simpan Perubahan Alamat"
            : "Tambah Alamat"}
      </Button>
    </form>
  );
}
