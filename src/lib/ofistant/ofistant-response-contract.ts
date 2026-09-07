import { z } from "zod";

/**
 * Provider-neutral contract for every generative Ofistant response.
 * Business facts remain server-owned; a model may only render language and
 * select a safe navigation action.
 */
export const ofistantModelResponseSchema = z.object({
  message: z.string().min(1).max(600),
  actionType: z.string().optional(),
  actionParam: z.string().optional(),
  quickReplies: z.array(z.string().min(1).max(80)).max(6).optional(),
  selectedIndustry: z.string().optional(),
  missingInformation: z.array(z.string().min(1).max(120)).max(6).optional(),
  handoffRequired: z.boolean().optional(),
  handoffDestination: z.enum(["admin", "cs_full_custom"]).optional(),
});

export type OfistantModelResponse = z.infer<typeof ofistantModelResponseSchema>;

export interface OfistantGroundingResult {
  ok: boolean;
  unsupportedFacts: string[];
}

const CRITICAL_FACT_PATTERNS = [
  /\b(?:rp\.?\s*)\d[\d.,]*/gi,
  /\b\d+(?:[.,]\d+)?\s*%/gi,
  /\b\d+\s*(?:pcs?|buah|potong|hari|jam|minggu|bulan)\b/gi,
  /\b(?:REQ|QUO|INV|ORD|OF)-[A-Z0-9/-]{4,}\b/gi,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
] as const;

function normalizeFact(value: string): string {
  return value.toLocaleLowerCase("id-ID").replace(/[\s.]/g, "").replace(/,/g, ".");
}

export function extractCriticalFacts(text: string): string[] {
  const facts = CRITICAL_FACT_PATTERNS.flatMap((pattern) => text.match(pattern) ?? []);
  return [...new Set(facts.map((fact) => fact.trim()))];
}

/** Rejects model-invented commercial/operational facts. */
export function validateGroundedOfistantMessage(
  message: string,
  trustedEvidence: readonly string[],
): OfistantGroundingResult {
  const evidence = normalizeFact(trustedEvidence.join("\n"));
  const unsupportedFacts = extractCriticalFacts(message).filter(
    (fact) => !evidence.includes(normalizeFact(fact)),
  );
  return { ok: unsupportedFacts.length === 0, unsupportedFacts };
}

