import { z } from "zod";

const date = z.string().date();

export const embroideryEstimatePayloadSchema = z.object({
  complexity: z.enum(["easy", "medium", "hard"]),
  estimatedStitchCount: z.coerce.number().int().min(0).max(10_000_000).nullable(),
  supervisorName: z.string().trim().min(2).max(120),
  supervisorNotes: z.string().trim().max(1000).nullable(),
  estimatedStartDate: date,
  estimatedCompletionDate: date,
  qcPackingDays: z.coerce.number().int().min(0).max(30),
  estimatedHandoverDate: date,
  courierCode: z.string().trim().min(2).max(40),
  courierService: z.string().trim().min(2).max(120),
  courierDurationMinDays: z.coerce.number().int().min(0).max(30),
  courierDurationMaxDays: z.coerce.number().int().min(0).max(60),
  estimatedArrivalStart: date,
  estimatedArrivalEnd: date,
  validUntil: date,
  publishToCustomer: z.boolean().default(false),
}).superRefine((value, context) => {
  const ordered = [value.estimatedStartDate, value.estimatedCompletionDate, value.estimatedHandoverDate, value.estimatedArrivalStart, value.estimatedArrivalEnd];
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index]! < ordered[index - 1]!) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["estimatedArrivalEnd"], message: "Urutan tanggal estimasi tidak valid." });
      break;
    }
  }
  if (value.courierDurationMaxDays < value.courierDurationMinDays) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["courierDurationMaxDays"], message: "Durasi maksimum harus lebih besar atau sama dengan minimum." });
  }
  if (value.estimatedHandoverDate < addDays(value.estimatedCompletionDate, value.qcPackingDays)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["estimatedHandoverDate"],
      message: "Tanggal serah ke kurir harus setelah estimasi selesai dan proses QC/packing.",
    });
  }
});

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export type EmbroideryEstimatePayload = z.infer<typeof embroideryEstimatePayloadSchema>;
