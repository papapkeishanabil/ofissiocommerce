"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImageUp,
  LoaderCircle,
  PenLine,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import type {
  BriefCustomAdjustment,
  BriefGender,
  BriefSignatureParty,
  ProductionRequestBrief,
  QuotationRequestRecord,
  TechnicalEmbroideryArea,
  TechnicalGarmentSpecification,
} from "@/features/quotation/quotation.types";
import {
  briefApprovalStatusLabel,
  getBriefApprovalStatus,
} from "@/features/quotation/quotation-requirement";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS: Array<{ value: BriefGender; label: string }> = [
  { value: "unspecified", label: "Umum" },
  { value: "men", label: "Pria" },
  { value: "women", label: "Wanita" },
  { value: "custom", label: "Custom" },
];

const ZONE_OPTIONS: Array<{ value: TechnicalEmbroideryArea["zone"]; label: string }> = [
  { value: "left_chest", label: "Dada kiri" },
  { value: "right_chest", label: "Dada kanan" },
  { value: "left_sleeve", label: "Lengan kiri" },
  { value: "right_sleeve", label: "Lengan kanan" },
  { value: "upper_back", label: "Punggung atas" },
  { value: "middle_back", label: "Punggung tengah" },
];

const internalHeaders = {
  "Content-Type": "application/json",
  "x-ofissio-internal-role": "super_admin",
  "x-ofissio-internal-user-id": "internal-dev",
} as const;

export function AdminBriefSignaturePanel({
  quotation,
}: {
  quotation: QuotationRequestRecord;
}) {
  const router = useRouter();
  const brief = quotation.productionBrief;
  if (!brief) return null;

  const approvalStatus = getBriefApprovalStatus(brief);
  const portalOrigin = brief.intakeChannel === "customer_portal";
  const signatures = brief.signatures ?? [];
  const hasCustomerSignature = signatures.some(
    (item) => item.party === "customer" && !item.revokedAt,
  );
  // Brief portal lahir "approved" tanpa pernah ditandatangani customer —
  // status itu artefak, bukan persetujuan desain; editor tetap terbuka.
  const locked = approvalStatus === "approved" && (!portalOrigin || hasCustomerSignature);
  const statusLabel =
    portalOrigin && approvalStatus === "approved" && !hasCustomerSignature
      ? "belum diminta ke customer"
      : briefApprovalStatusLabel(approvalStatus);
  const revisionNo = brief.revisionNo ?? 0;
  const activeSignature = (party: BriefSignatureParty) =>
    signatures.find((item) => item.party === party && !item.revokedAt);

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 text-brand-700"><PenLine className="h-5 w-5" aria-hidden="true" /><p className="type-eyebrow">Lembar approval desain</p></div>
          <h2 className="mt-2 text-lg font-bold text-ink">Tanda tangan &amp; revisi brief</h2>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Status: <strong className={locked ? "text-emerald-700" : "text-amber-700"}>{statusLabel}</strong>
            {revisionNo > 0 ? `, Revisi ${String(revisionNo).padStart(2, "0")}` : ""}
          </p>
          {portalOrigin ? (
            <p className="mt-1 text-xs font-semibold text-brand-700">
              Brief dari permintaan customer (portal){brief.enrichedAt ? `, diperkaya ${formatDate(brief.enrichedAt)}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {(["customer", "design", "production"] as const).map((party) => {
          const signature = activeSignature(party);
          return (
            <div key={party} className={cn("rounded-xl border p-4", signature ? "border-emerald-200 bg-emerald-50" : "border-line bg-slate-50")}>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">{partyLabel(party)}</p>
              {signature ? (
                <div className="mt-2">
                  <p className="font-bold text-ink">{signature.signerName}</p>
                  <p className="text-sm text-ink-muted">{signature.signerTitle}</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">ditandatangani {formatDate(signature.signedAt)}</p>
                </div>
              ) : party === "customer" ? (
                <p className="mt-2 text-sm text-ink-muted">Menunggu customer menandatangani lewat link approval.</p>
              ) : (
                <InternalSignatureForm quotationId={quotation.id} party={party} />
              )}
            </div>
          );
        })}
      </div>

      {signatures.some((item) => item.revokedAt) ? (
        <p className="mt-3 text-xs text-ink-muted">
          {signatures.filter((item) => item.revokedAt).length} tanda tangan lama dicabut (revisi/ubah brief).
        </p>
      ) : null}

      {locked ? (
        <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          Brief sudah disetujui customer. Minta revisi dari customer bila perlu mengubah brief.
        </p>
      ) : (
        <BriefEditor quotationId={quotation.id} brief={brief} onSaved={() => router.refresh()} />
      )}
    </section>
  );
}

function InternalSignatureForm({
  quotationId,
  party,
}: {
  quotationId: string;
  party: "design" | "production";
}) {
  const router = useRouter();
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sign() {
    if (signerName.trim().length < 2 || signerTitle.trim().length < 2) {
      setMessage("Isi nama dan jabatan penandatangan.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/quotations/${quotationId}/brief-signature`, {
        method: "POST",
        headers: internalHeaders,
        body: JSON.stringify({ party, signerName: signerName.trim(), signerTitle: signerTitle.trim() }),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Tanda tangan gagal disimpan.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tanda tangan gagal disimpan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <input aria-label={`Nama penandatangan ${partyLabel(party)}`} value={signerName} onChange={(event) => setSignerName(event.target.value)} className={compactInputClass} placeholder="Nama" maxLength={120} />
      <input aria-label={`Jabatan ${partyLabel(party)}`} value={signerTitle} onChange={(event) => setSignerTitle(event.target.value)} className={compactInputClass} placeholder="Jabatan" maxLength={120} />
      <Button type="button" size="sm" disabled={pending} onClick={() => void sign()}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        Tanda tangan {partyLabel(party)}
      </Button>
      {message ? <p role="alert" className="text-xs font-semibold text-red-600">{message}</p> : null}
    </div>
  );
}

function BriefEditor({
  quotationId,
  brief,
  onSaved,
}: {
  quotationId: string;
  brief: ProductionRequestBrief;
  onSaved: () => void;
}) {
  const [projectName, setProjectName] = useState(brief.projectName ?? "");
  const [designDescription, setDesignDescription] = useState(brief.designDescription ?? "");
  const [targetDate, setTargetDate] = useState(brief.targetDate ?? "");
  const [externalReference, setExternalReference] = useState(brief.externalReference ?? "");
  const [garments, setGarments] = useState<TechnicalGarmentSpecification[]>(
    brief.technicalSpecifications ?? [],
  );
  const [adjustments, setAdjustments] = useState<BriefCustomAdjustment[]>(
    brief.customAdjustments ?? [],
  );
  const [requireApproval, setRequireApproval] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const nextAdjustmentId = useRef((brief.customAdjustments?.length ?? 0) + 1);
  const nextGarmentId = useRef((brief.technicalSpecifications?.length ?? 0) + 1);

  // Brief portal hasil pengayaan belum punya garment — editor harus bisa
  // menambah item (skema admin brief mensyaratkan min. 1 garment).
  function addGarment() {
    const id = `g-${nextGarmentId.current++}`;
    setGarments((current) => [
      ...current,
      {
        id,
        category: "upper",
        garmentType: "Kemeja lapangan",
        templateKey: null,
        quantity: 1,
        specifications: [],
        sizeBreakdown: ["S", "M", "L", "XL", "2XL", "3XL"].map((size) => ({
          size,
          quantity: 0,
          gender: "unspecified" as const,
        })),
        embroideryAreas: [],
        figureFrontFileId: null,
        figureBackFileId: null,
      },
    ]);
  }

  function updateGarment(garmentId: string, patch: Partial<TechnicalGarmentSpecification>) {
    setGarments((current) =>
      current.map((garment) => (garment.id === garmentId ? { ...garment, ...patch } : garment)),
    );
  }

  function updateSizeEntry(garmentId: string, index: number, patch: Partial<{ size: string; quantity: number; gender: BriefGender }>) {
    setGarments((current) =>
      current.map((garment) =>
        garment.id === garmentId
          ? {
              ...garment,
              sizeBreakdown: garment.sizeBreakdown.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, ...patch } : entry,
              ),
            }
          : garment,
      ),
    );
  }

  function updateArea(garmentId: string, index: number, patch: Partial<TechnicalEmbroideryArea>) {
    setGarments((current) =>
      current.map((garment) =>
        garment.id === garmentId
          ? {
              ...garment,
              embroideryAreas: (garment.embroideryAreas ?? []).map((area, areaIndex) =>
                areaIndex === index ? { ...area, ...patch } : area,
              ),
            }
          : garment,
      ),
    );
  }

  function addArea(garmentId: string) {
    setGarments((current) =>
      current.map((garment) => {
        if (garment.id !== garmentId) return garment;
        const areas = garment.embroideryAreas ?? [];
        if (areas.length >= 6) return garment;
        const usedZones = new Set(areas.map((area) => area.zone));
        const zone = ZONE_OPTIONS.find((option) => !usedZones.has(option.value));
        if (!zone) return garment;
        return {
          ...garment,
          embroideryAreas: [
            ...areas,
            {
              label: String.fromCharCode(65 + areas.length),
              zone: zone.value,
              positionNote: null,
              offsetXCm: null,
              offsetYCm: null,
              widthCm: 8,
              heightCm: 4,
              technique: "embroidery",
              logoFileId: null,
              logoFileName: null,
              notes: null,
            },
          ],
        };
      }),
    );
  }

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const totalQuantity = garments.reduce(
        (total, garment) =>
          total + garment.sizeBreakdown.reduce((sum, entry) => sum + entry.quantity, 0),
        0,
      ) || (brief.estimatedQuantity ?? 1);
      const response = await fetch(`/api/admin/quotations/${quotationId}/brief`, {
        method: "PATCH",
        headers: internalHeaders,
        body: JSON.stringify({
          requireCustomerApproval: requireApproval,
          productionBrief: {
            projectName: projectName.trim(),
            garmentType: brief.garmentType ?? garments.map((garment) => garment.garmentType).join(" + "),
            estimatedQuantity: totalQuantity,
            usageContext: brief.usageContext ?? null,
            designDescription: designDescription.trim(),
            materialPreference: brief.materialPreference ?? null,
            colorPreference: brief.colorPreference ?? null,
            sizeNotes: brief.sizeNotes ?? null,
            targetDate: targetDate || null,
            referenceFiles: brief.referenceFiles ?? [],
            intakeChannel: brief.intakeChannel,
            externalReference: externalReference.trim() || null,
            technicalSpecifications: garments.map((garment) => ({
              ...garment,
              quantity:
                garment.sizeBreakdown.reduce((sum, entry) => sum + entry.quantity, 0) ||
                garment.quantity,
              embroideryAreas: (garment.embroideryAreas ?? []).filter(
                (area) => area.widthCm > 0 && area.heightCm > 0,
              ),
            })),
            customAdjustments: adjustments.filter(
              (adjustment) => adjustment.changeNote.trim().length >= 3,
            ),
          },
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Brief gagal disimpan.");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Brief gagal disimpan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 space-y-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">Edit brief (sebelum approval)</p>
          <p className="text-xs text-ink-muted">
            {!requireApproval
              ? "Brief akan disimpan tanpa persetujuan customer — pricing bisa langsung dilanjutkan."
              : "Perubahan mengembalikan status ke menunggu persetujuan customer dan mencabut ttd aktif."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(event) => setRequireApproval(event.target.checked)}
              className="h-4 w-4 accent-brand-700"
            />
            Minta tanda tangan customer
          </label>
          <Button type="button" size="sm" disabled={pending} onClick={() => void save()}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            Simpan perubahan brief
          </Button>
        </div>
      </div>
      {message ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm font-semibold text-ink">Nama proyek<input value={projectName} onChange={(event) => setProjectName(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-semibold text-ink">Target kebutuhan<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-semibold text-ink">No. PO / referensi<input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} className={inputClass} /></label>
      </div>
      <label className="block text-sm font-semibold text-ink">Ringkasan kebutuhan<textarea value={designDescription} onChange={(event) => setDesignDescription(event.target.value)} rows={2} className={textareaClass} /></label>

      {garments.map((garment, garmentIndex) => (
        <div key={garment.id} className="rounded-xl border border-line bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Item {garmentIndex + 1}</span>
              <input
                aria-label={`Jenis pakaian ${garmentIndex + 1}`}
                value={garment.garmentType}
                onChange={(event) => updateGarment(garment.id, { garmentType: event.target.value })}
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink outline-none focus:border-brand-500"
                maxLength={120}
              />
            </div>
            <div className="flex items-center gap-2">
              <FigureUpload quotationId={quotationId} garment={garment} onSaved={onSaved} />
              <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => setGarments((current) => current.filter((_, itemIndex) => itemIndex !== garmentIndex))}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Hapus
              </Button>
            </div>
          </div>

          <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Size &amp; gender</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {garment.sizeBreakdown.map((entry, index) => (
              <div key={`${garment.id}-size-${index}`} className="rounded-xl border border-line bg-white p-2">
                <input aria-label={`Nama size ${index + 1}`} value={entry.size} onChange={(event) => updateSizeEntry(garment.id, index, { size: event.target.value })} className="w-full border-0 bg-transparent text-center text-xs font-bold uppercase text-ink outline-none" />
                <input aria-label={`Quantity ${entry.size}`} type="number" min={0} value={entry.quantity || ""} onChange={(event) => updateSizeEntry(garment.id, index, { quantity: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 h-9 w-full rounded-lg border border-line bg-slate-50 px-2 text-center text-sm font-semibold outline-none focus:border-brand-500" placeholder="0" />
                <select aria-label={`Gender ${entry.size}`} value={entry.gender ?? "unspecified"} onChange={(event) => updateSizeEntry(garment.id, index, { gender: event.target.value as BriefGender })} className="mt-1 h-8 w-full rounded-lg border border-line bg-slate-50 px-1 text-center text-xs font-semibold text-ink-muted outline-none focus:border-brand-500">
                  {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Bordir &amp; area logo</p>
          {(garment.embroideryAreas ?? []).length > 0 ? (
            <div className="mt-2 space-y-2">
              {(garment.embroideryAreas ?? []).map((area, index) => (
                <div key={`${garment.id}-area-${index}`} className="grid gap-2 rounded-xl border border-line bg-white p-2 lg:grid-cols-[3rem_11rem_minmax(0,1fr)_6rem_6rem_8rem_auto] lg:items-center">
                  <input aria-label={`Label area ${index + 1}`} value={area.label} onChange={(event) => updateArea(garment.id, index, { label: event.target.value.slice(0, 4) })} className="h-10 rounded-lg border border-line bg-slate-50 px-2 text-center text-sm font-black uppercase text-ink outline-none focus:border-brand-500" maxLength={4} />
                  <select aria-label={`Zona area ${index + 1}`} value={area.zone} onChange={(event) => updateArea(garment.id, index, { zone: event.target.value as TechnicalEmbroideryArea["zone"] })} className={compactInputClass}>
                    {ZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input aria-label={`Posisi area ${index + 1}`} value={area.positionNote ?? ""} onChange={(event) => updateArea(garment.id, index, { positionNote: event.target.value || null })} className={compactInputClass} placeholder="Posisi" maxLength={160} />
                  <input aria-label={`Lebar area ${index + 1}`} type="number" min={1} max={30} step={0.5} value={area.widthCm} onChange={(event) => updateArea(garment.id, index, { widthCm: Number(event.target.value) || 0 })} className={cn(compactInputClass, "text-center")} />
                  <input aria-label={`Tinggi area ${index + 1}`} type="number" min={1} max={30} step={0.5} value={area.heightCm} onChange={(event) => updateArea(garment.id, index, { heightCm: Number(event.target.value) || 0 })} className={cn(compactInputClass, "text-center")} />
                  <select aria-label={`Teknik area ${index + 1}`} value={area.technique} onChange={(event) => updateArea(garment.id, index, { technique: event.target.value as TechnicalEmbroideryArea["technique"] })} className={compactInputClass}>
                    <option value="embroidery">Bordir</option>
                    <option value="print">Sablon</option>
                    <option value="patch">Patch</option>
                  </select>
                  <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => updateGarment(garment.id, { embroideryAreas: (garment.embroideryAreas ?? []).filter((_, areaIndex) => areaIndex !== index) })}>Hapus</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">Belum ada area bordir.</p>
          )}
          <Button type="button" variant="outline" size="sm" className="mt-2" disabled={(garment.embroideryAreas ?? []).length >= 6} onClick={() => addArea(garment.id)}>Tambah area</Button>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Ukuran spesifikasi</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {garment.specifications
              .filter((specification) => specification.status === "specified")
              .map((specification) => (
                <label key={specification.key} className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-line bg-white p-2 text-sm">
                  <span className="truncate font-semibold text-ink" title={specification.label}>{specification.label}</span>
                  <input
                    aria-label={`Ukuran ${specification.label}`}
                    value={specification.measurements ?? ""}
                    onChange={(event) =>
                      updateGarment(garment.id, {
                        specifications: garment.specifications.map((item) =>
                          item.key === specification.key
                            ? { ...item, measurements: event.target.value || null }
                            : item,
                        ),
                      })
                    }
                    className={compactInputClass}
                    placeholder="cth: 108 cm"
                    maxLength={120}
                  />
                </label>
              ))}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" disabled={garments.length >= 8} onClick={addGarment}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Tambah item pakaian
      </Button>

      <div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">Catatan custom</p>
          <Button type="button" variant="outline" size="sm" disabled={adjustments.length >= 20} onClick={() => setAdjustments((current) => [...current, { id: `adj-${nextAdjustmentId.current++}`, size: "", color: null, changeNote: "", quantity: 0 }])}>Tambah baris</Button>
        </div>
        {adjustments.length > 0 ? (
          <div className="mt-2 space-y-2">
            {adjustments.map((adjustment, index) => (
              <div key={adjustment.id} className="grid gap-2 rounded-xl border border-line bg-white p-2 lg:grid-cols-[6rem_8rem_minmax(0,1fr)_6rem_auto] lg:items-center">
                <input aria-label={`Ukuran penyesuaian ${index + 1}`} value={adjustment.size} onChange={(event) => setAdjustments((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, size: event.target.value } : item)))} className={compactInputClass} placeholder="Ukuran" />
                <input aria-label={`Warna ${index + 1}`} value={adjustment.color ?? ""} onChange={(event) => setAdjustments((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, color: event.target.value || null } : item)))} className={compactInputClass} placeholder="Warna" />
                <input aria-label={`Perubahan ${index + 1}`} value={adjustment.changeNote} onChange={(event) => setAdjustments((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, changeNote: event.target.value } : item)))} className={compactInputClass} placeholder="Perubahan" />
                <input aria-label={`Qty ${index + 1}`} type="number" min={0} value={adjustment.quantity || ""} onChange={(event) => setAdjustments((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity: Math.max(0, Number(event.target.value) || 0) } : item)))} className={cn(compactInputClass, "text-center")} placeholder="0" />
                <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => setAdjustments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Hapus</Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink-muted">Belum ada penyesuaian custom.</p>
        )}
      </div>
    </div>
  );
}

function FigureUpload({
  quotationId,
  garment,
  onSaved,
}: {
  quotationId: string;
  garment: TechnicalGarmentSpecification;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState<"front" | "back" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(side: "front" | "back", file: File) {
    setPending(side);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("garmentId", garment.id);
      formData.set("side", side);
      formData.set("file", file);
      const response = await fetch(`/api/admin/quotations/${quotationId}/brief-figure`, {
        method: "POST",
        headers: { "x-ofissio-internal-role": "super_admin", "x-ofissio-internal-user-id": "internal-dev" },
        body: formData,
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Upload figur gagal.");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload figur gagal.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["front", "back"] as const).map((side) => (
        <label key={side} className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-ink transition hover:border-brand-400", pending === side && "opacity-60")}>
          {pending === side ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ImageUp className="h-3.5 w-3.5" aria-hidden="true" />}
          {side === "front" ? "Figur depan" : "Figur belakang"}
          {side === "front" && garment.figureFrontFileId ? " ✓" : side === "back" && garment.figureBackFileId ? " ✓" : ""}
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(side, file);
              event.target.value = "";
            }}
          />
        </label>
      ))}
      {message ? <span role="alert" className="text-xs font-semibold text-red-600">{message}</span> : null}
    </div>
  );
}

function partyLabel(party: BriefSignatureParty) {
  if (party === "design") return "Desain";
  if (party === "production") return "Produksi";
  return "Pemesan";
}

function formatDate(value: string) {
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const inputClass = "min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";
const compactInputClass = "min-h-10 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const textareaClass = `${inputClass} resize-y leading-6`;
