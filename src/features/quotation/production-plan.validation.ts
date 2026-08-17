import { z } from "zod";

const date = z.string().date();

export const productionPlanPayloadSchema = z.object({
  ppicName: z.string().trim().min(2).max(120),
  productionNotes: z.string().trim().max(1500).nullable(),
  estimatedStartDate: date,
  materialReadyDate: date,
  cuttingStartDate: date,
  sewingStartDate: date,
  estimatedCompletionDate: date,
  qcPackingDays: z.coerce.number().int().min(0).max(30),
  estimatedHandoverDate: date,
  depositPercent: z.coerce.number().int().min(1).max(100),
  courierCode: z.string().trim().min(2).max(40),
  courierService: z.string().trim().min(2).max(120),
  courierDurationMinDays: z.coerce.number().int().min(0).max(30),
  courierDurationMaxDays: z.coerce.number().int().min(0).max(60),
  estimatedArrivalStart: date,
  estimatedArrivalEnd: date,
  validUntil: date,
  publishToCustomer: z.boolean().default(false),
}).superRefine((value, context) => {
  const ordered = [
    value.estimatedStartDate,
    value.materialReadyDate,
    value.cuttingStartDate,
    value.sewingStartDate,
    value.estimatedCompletionDate,
    value.estimatedHandoverDate,
    value.estimatedArrivalStart,
    value.estimatedArrivalEnd,
  ];
  if (ordered.some((item, index) => index > 0 && item < ordered[index - 1]!)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["estimatedCompletionDate"], message: "Urutan jadwal produksi tidak valid." });
  }
  if (value.estimatedHandoverDate < addDays(value.estimatedCompletionDate, value.qcPackingDays)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["estimatedHandoverDate"], message: "Tanggal serah ke kurir harus setelah produksi selesai dan QC/packing." });
  }
  if (value.courierDurationMaxDays < value.courierDurationMinDays) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["courierDurationMaxDays"], message: "Durasi maksimum harus lebih besar atau sama dengan minimum." });
  }
});

function addDays(dateValue: string, days: number) {
  const dateValueUtc = new Date(`${dateValue}T12:00:00Z`);
  dateValueUtc.setUTCDate(dateValueUtc.getUTCDate() + days);
  return dateValueUtc.toISOString().slice(0, 10);
}

export type ProductionPlanPayload = z.infer<typeof productionPlanPayloadSchema>;
