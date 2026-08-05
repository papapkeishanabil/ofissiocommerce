"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  MessageCircle,
  Plus,
  Shirt,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { AdminCustomerRow } from "@/features/admin/admin.types";
import type {
  CustomRequestIntakeChannel,
  TechnicalGarmentCategory,
  TechnicalGarmentSpecification,
  TechnicalSpecificationValue,
} from "@/features/quotation/quotation.types";
import { cn } from "@/lib/utils";

interface SpecDefinition {
  key: string;
  label: string;
  options: string[];
  detailPlaceholder: string;
}

interface GarmentDraft extends TechnicalGarmentSpecification {}

const UPPER_SPECS: SpecDefinition[] = [
  { key: "material", label: "Bahan utama", options: ["Maryland Drill", "Japan Drill", "Ripstop", "Twill", "Canvas", "Cotton", "Lainnya"], detailPlaceholder: "Kode bahan / gramasi" },
  { key: "color", label: "Warna", options: ["Navy", "Hitam", "Abu-abu", "Putih", "Khaki", "Hijau", "Custom"], detailPlaceholder: "Kode atau kombinasi warna" },
  { key: "sleeve", label: "Lengan", options: ["Pendek", "Panjang", "Detachable"], detailPlaceholder: "Catatan panjang / konstruksi" },
  { key: "collar", label: "Kerah", options: ["Kemeja", "Tegak", "Rebah", "Shanghai", "Rib"], detailPlaceholder: "Tinggi kerah, mis. 5 cm" },
  { key: "front_closure", label: "Penutup depan", options: ["Kancing", "Kancing snap", "Zipper", "Kancing + zipper"], detailPlaceholder: "Jenis, warna, atau ukuran" },
  { key: "zipper", label: "Zipper", options: ["Plastik", "Metal", "Coil", "Water resistant", "YKK", "Lainnya"], detailPlaceholder: "Merek, warna, panjang, lokasi" },
  { key: "chest_pocket", label: "Saku dada", options: ["Saku tempel", "Saku bobok", "Saku dalam", "Flap", "Zipper"], detailPlaceholder: "Jumlah, posisi, ukuran" },
  { key: "side_pocket", label: "Saku samping", options: ["Saku bobok", "Saku tempel", "Zipper", "Tidak berpenutup"], detailPlaceholder: "Jumlah, posisi, ukuran" },
  { key: "reflective", label: "Reflective tape / Scotchlite", options: ["Silver", "Abu", "Kuning", "Oranye", "Custom"], detailPlaceholder: "Lebar, lokasi, single/double stitch" },
  { key: "yoke", label: "Skoder / panel", options: ["Bahu", "Dada", "Lengan", "Punggung", "Kombinasi"], detailPlaceholder: "Ukuran dan posisi" },
  { key: "stitch", label: "Stitch / jahitan", options: ["Single", "Double", "Triple", "Kombinasi"], detailPlaceholder: "Lokasi dan warna benang" },
  { key: "cuff", label: "Manset", options: ["Kancing", "Snap", "Velcro", "Rib", "Elastic"], detailPlaceholder: "Tinggi / ukuran manset" },
  { key: "ventilation", label: "Ventilasi", options: ["Punggung", "Ketiak", "Eyelet", "Mesh"], detailPlaceholder: "Jumlah dan posisi" },
  { key: "lining", label: "Furing", options: ["Cotton", "Mesh", "Polyester", "Parasut"], detailPlaceholder: "Warna dan area" },
  { key: "rib_elastic", label: "Rib / karet", options: ["Pinggang", "Manset", "Samping", "Kombinasi"], detailPlaceholder: "Ukuran dan jarak" },
  { key: "slit", label: "Belahan", options: ["Samping", "Lengan", "Belakang"], detailPlaceholder: "Panjang belahan" },
];

const LOWER_SPECS: SpecDefinition[] = [
  { key: "material", label: "Bahan utama", options: ["Maryland Drill", "Japan Drill", "Ripstop", "Twill", "Canvas", "Lainnya"], detailPlaceholder: "Kode bahan / gramasi" },
  { key: "color", label: "Warna", options: ["Navy", "Hitam", "Abu-abu", "Khaki", "Hijau", "Custom"], detailPlaceholder: "Kode atau kombinasi warna" },
  { key: "model", label: "Model bawahan", options: ["Celana panjang", "Celana pendek", "Cargo", "Formal", "Rok"], detailPlaceholder: "Potongan atau referensi model" },
  { key: "fit", label: "Potongan", options: ["Regular", "Slim", "Relaxed", "Straight"], detailPlaceholder: "Catatan pola" },
  { key: "waist", label: "Pinggang", options: ["Ban pinggang", "Full elastic", "Half elastic", "Adjustable"], detailPlaceholder: "Lebar dan konstruksi" },
  { key: "closure", label: "Penutup", options: ["Zipper + kancing", "Snap", "Hook", "Tali"], detailPlaceholder: "Merek, bahan, atau warna" },
  { key: "belt_loop", label: "Belt loop", options: ["Standar", "Lebar", "Double"], detailPlaceholder: "Jumlah dan ukuran" },
  { key: "front_pocket", label: "Saku depan", options: ["Miring", "Bobok", "Tempel", "Zipper"], detailPlaceholder: "Jumlah dan ukuran" },
  { key: "back_pocket", label: "Saku belakang", options: ["Bobok", "Tempel", "Flap", "Velcro"], detailPlaceholder: "Jumlah dan ukuran" },
  { key: "cargo_pocket", label: "Saku cargo/samping", options: ["Gambol", "Tempel", "Flap", "Zipper", "Velcro"], detailPlaceholder: "Posisi dan ukuran" },
  { key: "reflective", label: "Reflective tape / Scotchlite", options: ["Silver", "Abu", "Kuning", "Oranye", "Custom"], detailPlaceholder: "Lebar, lokasi, single/double stitch" },
  { key: "reinforcement", label: "Reinforcement", options: ["Lutut", "Duduk", "Saku", "Kombinasi"], detailPlaceholder: "Bahan dan posisi" },
  { key: "stitch", label: "Stitch / jahitan", options: ["Single", "Double", "Triple", "Kombinasi"], detailPlaceholder: "Lokasi dan warna benang" },
  { key: "leg_opening", label: "Bukaan bawah", options: ["Normal", "Zipper", "Velcro", "Elastic"], detailPlaceholder: "Ukuran dan konstruksi" },
];

const INTAKE_OPTIONS: Array<{ value: CustomRequestIntakeChannel; label: string }> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Telepon" },
  { value: "email", label: "Email" },
  { value: "customer_visit", label: "Kunjungan customer" },
  { value: "other", label: "Lainnya" },
];

export function AdminSalesAssistedQuotationForm({
  customers,
}: {
  customers: AdminCustomerRow[];
}) {
  const router = useRouter();
  const nextGarmentId = useRef(2);
  const [companyId, setCompanyId] = useState("");
  const [picName, setPicName] = useState("");
  const [picEmail, setPicEmail] = useState("");
  const [picWhatsapp, setPicWhatsapp] = useState("");
  const [intakeChannel, setIntakeChannel] =
    useState<CustomRequestIntakeChannel>("whatsapp");
  const [projectName, setProjectName] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [usageContext, setUsageContext] = useState("");
  const [designDescription, setDesignDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [garments, setGarments] = useState<GarmentDraft[]>([
    createGarment("upper", "garment-1"),
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCustomer = customers.find((item) => item.companyId === companyId);
  const totalQuantity = useMemo(
    () => garments.reduce((total, garment) => total + resolvedGarmentQuantity(garment), 0),
    [garments],
  );
  const specifiedCount = useMemo(
    () => garments.reduce(
      (total, garment) => total + garment.specifications.filter((item) => item.status === "specified").length,
      0,
    ),
    [garments],
  );

  function addGarment(category: TechnicalGarmentCategory) {
    const id = `garment-${nextGarmentId.current++}`;
    setGarments((current) => [...current, createGarment(category, id)]);
  }

  function updateGarment(id: string, patch: Partial<GarmentDraft>) {
    setGarments((current) =>
      current.map((garment) => (garment.id === id ? { ...garment, ...patch } : garment)),
    );
  }

  function updateSpecification(
    garmentId: string,
    key: string,
    patch: Partial<TechnicalSpecificationValue>,
  ) {
    setGarments((current) => current.map((garment) =>
      garment.id === garmentId
        ? {
            ...garment,
            specifications: garment.specifications.map((specification) =>
              specification.key === key ? { ...specification, ...patch } : specification,
            ),
          }
        : garment,
    ));
  }

  function updateSize(garmentId: string, index: number, field: "size" | "quantity", value: string) {
    setGarments((current) => current.map((garment) => {
      if (garment.id !== garmentId) return garment;
      return {
        ...garment,
        sizeBreakdown: garment.sizeBreakdown.map((entry, entryIndex) =>
          entryIndex === index
            ? { ...entry, [field]: field === "quantity" ? Math.max(0, Number(value) || 0) : value }
            : entry,
        ),
      };
    }));
  }

  async function submit() {
    setMessage(null);
    if (!companyId || !selectedCustomer) {
      setMessage("Pilih customer yang sudah terdaftar.");
      return;
    }
    if (picName.trim().length < 2 || !picEmail.includes("@")) {
      setMessage("Lengkapi nama dan email PIC customer.");
      return;
    }
    if (projectName.trim().length < 3 || designDescription.trim().length < 10) {
      setMessage("Lengkapi nama proyek dan ringkasan kebutuhan minimal 10 karakter.");
      return;
    }
    if (totalQuantity < 1 || garments.some((garment) => garment.garmentType.trim().length < 2)) {
      setMessage("Lengkapi jenis pakaian dan quantity setiap item.");
      return;
    }

    setSubmitting(true);
    try {
      const materialPreference = summarizeSpec(garments, "material");
      const colorPreference = summarizeSpec(garments, "color");
      const sizeNotes = garments
        .map((garment) => {
          const sizes = garment.sizeBreakdown
            .filter((entry) => entry.size.trim() && entry.quantity > 0)
            .map((entry) => `${entry.size}: ${entry.quantity}`)
            .join(", ");
          return sizes ? `${garment.garmentType}: ${sizes}` : null;
        })
        .filter(Boolean)
        .join(" | ");
      const response = await fetch("/api/admin/quotations/sales-assisted", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
        body: JSON.stringify({
          companyId,
          picName: picName.trim(),
          picEmail: picEmail.trim(),
          picWhatsapp: picWhatsapp.trim() || null,
          productionBrief: {
            projectName: projectName.trim(),
            garmentType: garments.map((garment) => garment.garmentType.trim()).join(" + "),
            estimatedQuantity: totalQuantity,
            usageContext: usageContext.trim() || null,
            designDescription: designDescription.trim(),
            materialPreference: materialPreference || null,
            colorPreference: colorPreference || null,
            sizeNotes: sizeNotes || null,
            targetDate: targetDate || null,
            intakeChannel,
            externalReference: externalReference.trim() || null,
            technicalSpecifications: garments.map((garment) => ({
              ...garment,
              quantity: resolvedGarmentQuantity(garment),
            })),
          },
          customerNotes: customerNotes.trim() || null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        brief?: { id: string };
      };
      if (!response.ok || !result.ok || !result.brief) {
        throw new Error(result.message ?? "Brief Full Custom belum dapat disimpan.");
      }
      router.push(`/admin/quotations/${result.brief.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Brief Full Custom belum dapat disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5">
        <FormCard
          icon={<MessageCircle className="h-5 w-5" aria-hidden="true" />}
          title="Customer dan sumber percakapan"
          description="Sales mencatat PIC yang memberikan brief. Customer harus sudah terdaftar agar quotation tetap company-scoped."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Customer perusahaan" required>
              <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className={inputClass}>
                <option value="">Pilih customer terdaftar</option>
                {customers.map((customer) => (
                  <option key={customer.companyId} value={customer.companyId}>{customer.companyName}</option>
                ))}
              </select>
            </Field>
            <Field label="Kanal masuk" required>
              <select value={intakeChannel} onChange={(event) => setIntakeChannel(event.target.value as CustomRequestIntakeChannel)} className={inputClass}>
                {INTAKE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Nama PIC" required><input value={picName} onChange={(event) => setPicName(event.target.value)} className={inputClass} placeholder="Nama customer" /></Field>
            <Field label="Email PIC" required><input type="email" value={picEmail} onChange={(event) => setPicEmail(event.target.value)} className={inputClass} placeholder="pic@perusahaan.com" /></Field>
            <Field label="WhatsApp PIC"><input value={picWhatsapp} onChange={(event) => setPicWhatsapp(event.target.value)} className={inputClass} placeholder="08... atau +62..." /></Field>
            <Field label="Nomor PO / referensi"><input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} className={inputClass} placeholder="Opsional" /></Field>
          </div>
        </FormCard>

        <FormCard
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          title="Informasi proyek"
          description="Informasi umum berlaku untuk seluruh atasan dan bawahan dalam proyek ini."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama proyek" required><input value={projectName} onChange={(event) => setProjectName(event.target.value)} className={inputClass} placeholder="Contoh: Seragam proyek WIKA 2026" /></Field>
            <Field label="Target kebutuhan"><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className={inputClass} /></Field>
          </div>
          <Field label="Konteks penggunaan"><input value={usageContext} onChange={(event) => setUsageContext(event.target.value)} className={inputClass} placeholder="Outdoor, area panas, proyek konstruksi, kantor, dan sebagainya" /></Field>
          <Field label="Ringkasan kebutuhan" required>
            <textarea value={designDescription} onChange={(event) => setDesignDescription(event.target.value)} rows={3} className={textareaClass} placeholder="Ringkas kebutuhan utama customer dari percakapan WhatsApp." />
          </Field>
        </FormCard>

        <section className="rounded-xl border border-line bg-white p-5 shadow-soft-sm">
          <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand-700"><Shirt className="h-5 w-5" aria-hidden="true" /><p className="type-eyebrow">Technical specification builder</p></div>
              <h2 className="mt-2 text-lg font-bold text-ink">Item pakaian</h2>
              <p className="mt-1 text-sm leading-6 text-ink-muted">Pilih status setiap spesifikasi. Field detail hanya muncul ketika fitur digunakan.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addGarment("upper")}><Plus className="h-4 w-4" aria-hidden="true" />Atasan</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addGarment("lower")}><Plus className="h-4 w-4" aria-hidden="true" />Bawahan</Button>
            </div>
          </div>
          <div className="mt-5 space-y-5">
            {garments.map((garment, index) => (
              <GarmentEditor
                key={garment.id}
                index={index}
                garment={garment}
                removable={garments.length > 1}
                onRemove={() => setGarments((current) => current.filter((item) => item.id !== garment.id))}
                onChange={(patch) => updateGarment(garment.id, patch)}
                onSpecChange={(key, patch) => updateSpecification(garment.id, key, patch)}
                onSizeChange={(sizeIndex, field, value) => updateSize(garment.id, sizeIndex, field, value)}
              />
            ))}
          </div>
        </section>

        <FormCard title="Catatan percakapan" description="Simpan keputusan customer yang belum masuk ke pilihan teknis di atas.">
          <textarea value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} rows={4} className={textareaClass} placeholder="Contoh: customer akan mengirim logo final setelah approval desain." />
        </FormCard>
      </div>

      <aside className="xl:sticky xl:top-24">
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-soft-md">
          <div className="bg-brand-950 p-5 text-white">
            <p className="type-eyebrow text-brand-200">Sales-assisted intake</p>
            <h2 className="mt-2 text-lg font-bold">Ringkasan brief</h2>
          </div>
          <dl className="space-y-3 p-5 text-sm">
            <Summary label="Customer" value={selectedCustomer?.companyName ?? "Belum dipilih"} />
            <Summary label="Kanal" value={INTAKE_OPTIONS.find((item) => item.value === intakeChannel)?.label ?? intakeChannel} />
            <Summary label="Item" value={`${garments.length} jenis pakaian`} />
            <Summary label="Total qty" value={`${totalQuantity} pcs`} />
            <Summary label="Spek terisi" value={`${specifiedCount} pilihan`} />
            <Summary label="Rute" value="Production / SPK" strong />
          </dl>
          <div className="border-t border-line p-5">
            <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Brief disimpan sebagai draft dan menunggu persetujuan customer. Pricing serta quotation resmi tetap terkunci sampai customer menyetujuinya.
            </div>
            {message ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
            <Button type="button" className="mt-4 w-full" disabled={submitting} aria-busy={submitting} onClick={() => void submit()}>
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              {submitting ? "Menyimpan..." : "Simpan brief untuk approval"}
              {!submitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function GarmentEditor({
  index,
  garment,
  removable,
  onRemove,
  onChange,
  onSpecChange,
  onSizeChange,
}: {
  index: number;
  garment: GarmentDraft;
  removable: boolean;
  onRemove: () => void;
  onChange: (patch: Partial<GarmentDraft>) => void;
  onSpecChange: (key: string, patch: Partial<TechnicalSpecificationValue>) => void;
  onSizeChange: (index: number, field: "size" | "quantity", value: string) => void;
}) {
  const definitions = garment.category === "lower" ? LOWER_SPECS : UPPER_SPECS;
  const sizeTotal = garment.sizeBreakdown.reduce((total, item) => total + item.quantity, 0);
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-slate-50/70">
      <header className="flex flex-col gap-3 border-b border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-sm font-bold text-white">{index + 1}</span>
          <div>
            <p className="font-bold text-ink">{garment.category === "lower" ? "Bawahan" : "Atasan"}</p>
            <p className="text-xs text-ink-muted">Preset mengaktifkan daftar spesifikasi yang relevan.</p>
          </div>
        </div>
        {removable ? <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={onRemove}><Trash2 className="h-4 w-4" aria-hidden="true" />Hapus item</Button> : null}
      </header>
      <div className="space-y-5 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Jenis pakaian" required><input value={garment.garmentType} onChange={(event) => onChange({ garmentType: event.target.value })} className={inputClass} placeholder="Kemeja lapangan" /></Field>
          <Field label="Template spek">
            <select value={garment.templateKey ?? ""} onChange={(event) => onChange({ templateKey: event.target.value || null })} className={inputClass}>
              {(garment.category === "lower" ? ["Celana cargo", "Celana kerja", "Celana formal"] : ["Kemeja lapangan", "Jaket kerja", "Kemeja kantor", "Rompi"]).map((item) => <option key={item} value={item.toLowerCase().replace(/ /g, "_")}>{item}</option>)}
            </select>
          </Field>
          <Field label={sizeTotal > 0 ? "Qty (dari size matrix)" : "Quantity"} required>
            <input type="number" min={1} value={sizeTotal > 0 ? sizeTotal : garment.quantity} disabled={sizeTotal > 0} onChange={(event) => onChange({ quantity: Math.max(1, Number(event.target.value) || 1) })} className={cn(inputClass, "disabled:bg-slate-100 disabled:text-ink-muted")} />
          </Field>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Checklist spesifikasi</p>
          <div className="mt-2 grid gap-2">
            {definitions.map((definition) => {
              const specification = garment.specifications.find((item) => item.key === definition.key);
              if (!specification) return null;
              return (
                <div key={definition.key} className="grid gap-3 rounded-xl border border-line bg-white p-3 lg:grid-cols-[12rem_11rem_minmax(0,1fr)] lg:items-center">
                  <label htmlFor={`${garment.id}-${definition.key}-status`} className="text-sm font-semibold text-ink">{definition.label}</label>
                  <select id={`${garment.id}-${definition.key}-status`} value={specification.status} onChange={(event) => onSpecChange(definition.key, { status: event.target.value as TechnicalSpecificationValue["status"] })} className={compactInputClass}>
                    <option value="not_used">Tidak digunakan</option>
                    <option value="specified">Digunakan</option>
                    <option value="recommendation">Minta rekomendasi</option>
                  </select>
                  {specification.status === "specified" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select aria-label={`Pilihan ${definition.label}`} value={specification.option ?? ""} onChange={(event) => onSpecChange(definition.key, { option: event.target.value || null })} className={compactInputClass}>
                        <option value="">Pilih</option>
                        {definition.options.map((option) => <option key={option}>{option}</option>)}
                      </select>
                      <input aria-label={`Detail ${definition.label}`} value={specification.detail ?? ""} onChange={(event) => onSpecChange(definition.key, { detail: event.target.value || null })} className={compactInputClass} placeholder={definition.detailPlaceholder} />
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">{specification.status === "recommendation" ? "Tim technical akan menentukan rekomendasi." : "Tidak masuk spesifikasi produksi."}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Size & quantity matrix</p><p className="mt-1 text-xs text-ink-muted">Kosongkan quantity jika pembagian size belum diterima.</p></div>
            {sizeTotal > 0 ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">Total {sizeTotal} pcs</span> : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {garment.sizeBreakdown.map((entry, sizeIndex) => (
              <div key={`${garment.id}-size-${sizeIndex}`} className="rounded-xl border border-line bg-white p-2">
                <input aria-label={`Nama size ${sizeIndex + 1}`} value={entry.size} onChange={(event) => onSizeChange(sizeIndex, "size", event.target.value)} className="w-full border-0 bg-transparent text-center text-xs font-bold uppercase text-ink outline-none" />
                <input aria-label={`Quantity size ${entry.size}`} type="number" min={0} value={entry.quantity || ""} onChange={(event) => onSizeChange(sizeIndex, "quantity", event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-slate-50 px-2 text-center text-sm font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function createGarment(category: TechnicalGarmentCategory, id: string): GarmentDraft {
  const lower = category === "lower";
  const definitions = lower ? LOWER_SPECS : UPPER_SPECS;
  return {
    id,
    category,
    garmentType: lower ? "Celana kerja" : "Kemeja lapangan",
    templateKey: lower ? "celana_kerja" : "kemeja_lapangan",
    quantity: 1,
    specifications: definitions.map((definition) => ({
      key: definition.key,
      label: definition.label,
      status: definition.key === "material" || definition.key === "color" ? "recommendation" : "not_used",
      option: null,
      detail: null,
      notes: null,
    })),
    sizeBreakdown: (lower ? ["28", "30", "32", "34", "36", "38"] : ["S", "M", "L", "XL", "2XL", "3XL"]).map((size) => ({ size, quantity: 0 })),
  };
}

function resolvedGarmentQuantity(garment: GarmentDraft) {
  const sizeTotal = garment.sizeBreakdown.reduce((total, item) => total + item.quantity, 0);
  return sizeTotal > 0 ? sizeTotal : Math.max(1, garment.quantity);
}

function summarizeSpec(garments: GarmentDraft[], key: string) {
  return garments.map((garment) => {
    const specification = garment.specifications.find((item) => item.key === key);
    if (!specification || specification.status === "not_used") return null;
    if (specification.status === "recommendation") return `${garment.garmentType}: minta rekomendasi`;
    const value = [specification.option, specification.detail].filter(Boolean).join(" - ");
    return value ? `${garment.garmentType}: ${value}` : null;
  }).filter(Boolean).join(" | ");
}

function FormCard({ icon, title, description, children }: { icon?: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-line bg-white p-5 shadow-soft-sm"><div className="flex items-start gap-3 border-b border-line pb-4">{icon ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span> : null}<div><h2 className="font-bold text-ink">{title}</h2><p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p></div></div><div className="mt-4 space-y-4">{children}</div></section>;
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-ink"><span>{label}{required ? <span className="text-red-600"> *</span> : null}</span><span className="mt-1.5 block">{children}</span></label>;
}

function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><dt className="text-ink-muted">{label}</dt><dd className={cn("max-w-[11rem] text-right font-semibold text-ink", strong && "text-brand-700")}>{value}</dd></div>;
}

const inputClass = "min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";
const compactInputClass = "min-h-10 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const textareaClass = `${inputClass} resize-y leading-6`;
