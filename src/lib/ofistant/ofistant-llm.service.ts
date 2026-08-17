// src/lib/ofistant/ofistant-llm.service.ts
// HYBRID brain (Phase 7): Google Gemini (via Vercel AI SDK) handles the
// natural-conversation + navigation turns that the rule engine can't parse,
// while the rule engine (ofistant.service.ts) remains the source of truth for
// FACTUAL answers (price, embroidery, MOQ, stock, order status) — those carry
// real data and are preferred whenever the rules understand the query.
//
// The route runs the rule engine first; this LLM path is only consulted when
// the rules fall through to their generic "I don't understand" fallback.
//
// IMPORTANT (model reality): the configured model is a flash-lite preview that
// does NOT reliably combine tool-calling with structured output, and produces
// empty text when forced through many tool steps. So this v1 uses STRUCTURED
// OUTPUT ONLY (no tools) — which the model handles well — and leans on the
// system prompt + rule fallback for anti-hallucination. Factual tools can be
// re-introduced once a stronger model (e.g. gemini-flash-latest) is configured.
//
// Mirrors the house service pattern (see src/lib/meshy/meshy-service.ts):
// `is…Configured()` + `{ok:true,…}|{ok:false,reason}`. Never throws.

import "server-only";

import {
  generateText,
  isStepCount,
  NoObjectGeneratedError,
  Output,
  type ModelMessage,
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

import {
  ofistantActionSchema,
  type OfistantAction,
  type ActionType,
} from "@/lib/ofistant/ofistant.actions";
import {
  JOURNEY_STAGES,
  type JourneyStage,
  type OfistantContext,
  type OfistantPageContext,
  type OfistantResponse,
} from "@/lib/ofistant/ofistant.types";
import { getOptionalServerEnv } from "@/lib/security/server-only-secret";
import { getPublicCatalogTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import type { PublicCatalogTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.types";
import { listPublishedKnowledgeArticles } from "@/features/ofistant-knowledge/ofistant-knowledge.service";
import type { OfistantKnowledgeArticle } from "@/features/ofistant-knowledge/ofistant-knowledge.types";

// ---------------------------------------------------------------------------
// Feature flag / kill switch
// ---------------------------------------------------------------------------

/**
 * LLM path is live only when:
 *  - `OFISTANT_LLM_ENABLED` is not explicitly "false"/"0"/"off" (default: on), AND
 *  - a `GEMINI_API_KEY` server secret is present.
 * The route only calls this for fallback turns, so disabling it simply keeps
 * the old rule-engine behavior everywhere.
 */
export function isOfistantLlmConfigured(): boolean {
  const enabled = getOptionalServerEnv("OFISTANT_LLM_ENABLED", "true")
    .trim()
    .toLowerCase();
  if (enabled === "false" || enabled === "0" || enabled === "off") {
    return false;
  }
  return Boolean(getOptionalServerEnv("GEMINI_API_KEY"));
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const sizeMatrixSchema = z.object({
  S: z.number(),
  M: z.number(),
  L: z.number(),
  XL: z.number(),
  "2XL": z.number(),
  "3XL": z.number(),
});

const journeyStageEnum = z.enum(
  JOURNEY_STAGES as unknown as [JourneyStage, ...JourneyStage[]],
);

/**
 * Structured-output schema the model must return. Verified Gemini-flash-lite
 * friendly: scalars + one optional string array, NO discriminated unions,
 * enums, or nullable types in the emitted shape. The `actionType`/`actionParam`
 * flat pair is reconstructed into a proper discriminated OfistantAction
 * server-side (see buildActionFromFlat).
 */
const ofistantResponseSchema = z.object({
  message: z.string().min(1).max(600),
  actionType: z.string().optional(),
  actionParam: z.string().optional(),
  quickReplies: z.array(z.string()).max(6).optional(),
  selectedIndustry: z.string().optional(),
});

const pageContextLineSchema = z.object({
  productName: z.string(),
  color: z.string(),
  totalQty: z.number(),
  unitPrice: z.number(),
  subtotal: z.number(),
  tierLabel: z.string().nullable().optional(),
  embroidery: z.array(
    z.object({
      label: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      subtotal: z.number(),
    }),
  ),
  embroideryTotal: z.number(),
});

const pageContextSchema = z.object({
  route: z.string(),
  label: z.string(),
  cartPage: z.boolean(),
  lines: z.array(pageContextLineSchema),
  cartTotal: z.number(),
  note: z.string().nullable().optional(),
});

/** Loose mirror of OfistantContext the client sends; validated permissively. */
export const ofistantContextPayloadSchema = z.object({
  companyId: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  currentOrderId: z.string().nullable().optional(),
  selectedIndustry: z.string().nullable().optional(),
  selectedProductId: z.string().nullable().optional(),
  selectedProductSlug: z.string().nullable().optional(),
  selectedColor: z.string().nullable().optional(),
  sizeMatrix: sizeMatrixSchema.nullable().optional(),
  viewedProductIds: z.array(z.string()).optional(),
  cartSummary: z
    .object({
      itemCount: z.number(),
      totalQty: z.number(),
      totalEstimatedPrice: z.number(),
    })
    .nullable()
    .optional(),
  /**
   * Snapshot of the page the customer is viewing (route + real cart/embroidery
   * breakdown). When present, the model MAY cite these real numbers (see the
   * anti-hallucination carve-out in the system prompt) — they are not fabricated.
   */
  pageContext: pageContextSchema.nullable().optional(),
  uploadedLogoPlaceholder: z.boolean().optional(),
  embroideryPlacements: z.array(z.string()).optional(),
  journeyStage: journeyStageEnum.optional(),
  /**
   * Carried estimate request (qty + embroidery zones) from a turn that asked
   * for a price estimate but had no product yet. The stateless chat route
   * rebuilds ctx from `emptyContext() + body.context` each turn, so this MUST
   * round-trip through the client for `resolvePendingEstimate` to fire later.
   * Zones are validated as plain strings (the rule engine is the authority and
   * treats unknown zones as "unsupported" — honest, no crash).
   */
  pendingEstimateRequest: z
    .object({
      qty: z.number(),
      zones: z.array(z.string()),
    })
    .nullable()
    .optional(),
  turnsTaken: z.number().optional(),
});

export const chatMessagePayloadSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  text: z.string().max(2000),
});

export type OfistantContextPayload = z.infer<
  typeof ofistantContextPayloadSchema
>;
export type OfistantChatHistoryEntry = z.infer<typeof chatMessagePayloadSchema>;

// ---------------------------------------------------------------------------
// Action reconstruction (flat -> discriminated OfistantAction)
// ---------------------------------------------------------------------------

const NAV_HANDOFF_TYPES: ReadonlySet<string> = new Set<ActionType>([
  "SHOW_PRODUCTS",
  "OPEN_PRODUCT_DETAIL",
  "OPEN_CART",
  "OPEN_CHECKOUT",
  "OPEN_REGISTER",
  "REQUEST_QUOTATION",
  "OPEN_CUSTOM_REQUEST",
  "OPEN_ORDER_TRACKING",
  "REQUEST_HUMAN_HANDOFF",
]);

function buildActionFromFlat(
  actionType: string | undefined,
  actionParam: string | undefined,
): OfistantAction | undefined {
  if (!actionType || !NAV_HANDOFF_TYPES.has(actionType)) return undefined;
  const param = actionParam?.trim() || undefined;
  let candidate: OfistantAction | undefined;
  switch (actionType) {
    case "SHOW_PRODUCTS":
      candidate = { type: "SHOW_PRODUCTS", payload: { industry: param } };
      break;
    case "OPEN_PRODUCT_DETAIL":
      candidate = param
        ? { type: "OPEN_PRODUCT_DETAIL", payload: { slug: param } }
        : undefined;
      break;
    case "OPEN_CART":
      candidate = { type: "OPEN_CART" };
      break;
    case "OPEN_CHECKOUT":
      candidate = { type: "OPEN_CHECKOUT" };
      break;
    case "OPEN_REGISTER":
      candidate = { type: "OPEN_REGISTER" };
      break;
    case "REQUEST_QUOTATION":
      candidate = { type: "REQUEST_QUOTATION" };
      break;
    case "OPEN_CUSTOM_REQUEST":
      candidate = { type: "OPEN_CUSTOM_REQUEST" };
      break;
    case "OPEN_ORDER_TRACKING":
      candidate = { type: "OPEN_ORDER_TRACKING", payload: param ? { orderId: param } : undefined };
      break;
    case "REQUEST_HUMAN_HANDOFF":
      candidate = { type: "REQUEST_HUMAN_HANDOFF" };
      break;
    default:
      candidate = undefined;
  }
  if (!candidate) return undefined;
  // Re-validate against the full discriminated union; strip if malformed.
  const parsed = ofistantActionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function formatIDRCompact(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Render the live page snapshot into a concise, model-readable block. The
 * numbers here are REAL (read from cart-store), so the prompt explicitly allows
 * the model to cite them — this is how Ofistant answers "kenapa harga bordir
 * sekian" from the actual checkout/cart breakdown instead of guessing.
 */
function formatPageContextBlock(page: OfistantPageContext | null): string | null {
  if (!page) return null;
  const parts: string[] = [`Halaman saat ini: ${page.label}`];
  if (page.cartPage) {
    if (page.lines.length === 0) {
      parts.push("Keranjang kosong (belum ada item).");
    } else {
      const linesText = page.lines.slice(0, 8).map((l, i) => {
        const tier = l.tierLabel ? ` (tier ${l.tierLabel})` : "";
        const head = `${i + 1}) ${l.productName} — warna ${l.color} — ${l.totalQty} pcs @ ${formatIDRCompact(l.unitPrice)}${tier} = ${formatIDRCompact(l.subtotal)}`;
        if (l.embroidery.length === 0) return head;
        const emb = l.embroidery
          .slice(0, 6)
          .map(
            (e) =>
              `${e.label} (${e.quantity}x ${formatIDRCompact(e.unitPrice)} = ${formatIDRCompact(e.subtotal)})`,
          )
          .join("; ");
        return `${head} | Bordir: ${emb} | total bordir ${formatIDRCompact(l.embroideryTotal)}`;
      });
      parts.push("Rincian keranjang (data nyata):\n" + linesText.join("\n"));
      parts.push(`Total estimasi keranjang: ${formatIDRCompact(page.cartTotal)}`);
    }
  } else if (page.note) {
    parts.push(page.note);
  }
  return parts.join("\n");
}

function buildSystemPrompt(
  ctx: OfistantContext,
  cart: CartSnapshot,
  taxonomy: PublicCatalogTaxonomy,
  knowledge: OfistantKnowledgeArticle[],
): string {
  const industryList =
    taxonomy.industries.map((i) => i.name).join(", ") || "(belum ada data)";
  const categoryList =
    taxonomy.categories.map((c) => c.name).join(", ") || "(belum ada data)";
  const pageBlock = formatPageContextBlock(ctx.pageContext);
  const knowledgeBlock = knowledge.length
    ? knowledge.slice(0, 40).map((article, index) => `${index + 1}. [${article.category}] ${article.question}\nJawaban resmi: ${article.answer}`).join("\n\n")
    : "(belum ada artikel Knowledge Base yang diterbitkan)";
  return [
    `Kamu adalah "Ofistant", asisten pengadaan seragam kerja B2B untuk perusahaan Ofissio. Kamu hanya ikut campur saat mesin rule utama tidak menangkap maksud pelanggan — jadi tugasmu adalah memahami bahasa natural dan membantu pelanggan maju.`,
    ``,
    `ATURAN MUTLAK (anti-halusinasi):`,
    `- JANGAN pernah MENGARANG angka harga, biaya bordir, MOQ, lead time, stok, atau resi.`,
    `- Pengecualian penting: bila ada bagian "INFORMASI HALAMAN SAAT INI" di bawah, angka di sana adalah DATA NYATA yang sedang dilihat pelanggan di layarnya. Kamu BOLEH dan wajib bisa menjelaskan & merincinya bila ditanya — mis. "kenapa harga bordir segini" -> uraikan rincian bordir dari data tersebut.`,
    `- Di luar data halaman itu, untuk harga pasti / kuantitas / bordir / status order, arahkan pelanggan ke "Request quotation" atau "Hubungi CS Ofissio". Boleh menyebut rentang umum HANYA jika yakin, tetap dorong ke quotation untuk angka final.`,
    `- Untuk kebijakan/SOP/FAQ, gunakan hanya bagian KNOWLEDGE BASE RESMI. Jika tidak tercantum, katakan informasinya belum tersedia lalu tawarkan bantuan tim Ofissio.`,
    ``,
    `GAYA:`,
    `- Balas dalam Bahasa Indonesia, singkat, sopan, dan ramah. Sapa "Pak/Bu" bila pantas.`,
    `- Gunakan teks polos. Bila merinci daftar (mis. tarif per posisi atau rincian biaya), pecah jadi baris pendek berawalan "- ". JANGAN gunakan asterisk (*), bold, heading, atau markdown lain.`,
    `- Singkat: 2-3 kalimat untuk jawaban biasa; daftar baris maksimal 5 poin.`,
    `- Format harga umum dalam Rupiah, cth: ${formatIDRCompact(45000)}.`,
    ``,
    `MEMILIH ACTION (isi actionType hanya bila ingin navigasi; kosongkan bila hanya menjawab):`,
    `- SHOW_PRODUCTS (actionParam = nama industri, cth "Pertambangan") saat pelanggan ingin lihat produk/seragam.`,
    `- OPEN_PRODUCT_DETAIL (actionParam = slug produk) hanya jika yakin slug-nya; jika tidak yakin, arahkan ke katalog saja.`,
    `- OPEN_CART, OPEN_CHECKOUT, OPEN_REGISTER, REQUEST_QUOTATION, OPEN_CUSTOM_REQUEST, OPEN_ORDER_TRACKING (actionParam = orderId bila disebut), REQUEST_HUMAN_HANDOFF.`,
    `- JANGAN gunakan ADD_TO_CART atau SET_*.`,
    ``,
    `QUICK REPLIES:`,
    `- Berikan 2-4 quick reply singkat dalam Bahasa Indonesia yang relevan.`,
    ``,
    `KONTEKS SESI:`,
    `- Industri terpilih: ${ctx.selectedIndustry ?? "-"}`,
    `- Produk terpilih: ${ctx.selectedProductSlug ?? "-"}`,
    `- Keranjang: ${cart.itemCount} produk, total ${cart.totalQty} pcs`,
    `- Tahap: ${ctx.journeyStage}`,
    `- Login: ${
      ctx.companyName ? `${ctx.companyName} (terautentikasi)` : "tamu (belum login)"
    }`,
    ``,
    `INFORMASI HALAMAN SAAT INI:`,
    pageBlock ?? `(tidak ada rincian halaman yang diketahui)`,
    ``,
    `INDUSTRI TERSEDIA: ${industryList}`,
    `KATEGORI TERSEDIA: ${categoryList}`,
    ``,
    `KNOWLEDGE BASE RESMI (hanya artikel Published):`,
    knowledgeBlock,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// generateOfistantReply
// ---------------------------------------------------------------------------

export interface CartSnapshot {
  itemCount: number;
  totalQty: number;
  totalEstimatedPrice: number;
}

export interface GenerateOfistantReplyInput {
  message: string;
  context: OfistantContext;
  cart: CartSnapshot;
  history: OfistantChatHistoryEntry[];
  companyId: string | null;
}

export type GenerateOfistantReplyResult =
  | { ok: true; response: OfistantResponse; source: "llm" }
  | { ok: false; reason: string };

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash-lite";

export async function generateOfistantReply(
  input: GenerateOfistantReplyInput,
): Promise<GenerateOfistantReplyResult> {
  if (!isOfistantLlmConfigured()) {
    return { ok: false, reason: "llm-not-configured" };
  }

  const apiKey = getOptionalServerEnv("GEMINI_API_KEY");
  if (!apiKey) {
    return { ok: false, reason: "missing-gemini-key" };
  }
  const modelName = getOptionalServerEnv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL);

  // Inject taxonomy once for the system prompt context.
  let taxonomy: PublicCatalogTaxonomy;
  let knowledge: OfistantKnowledgeArticle[];
  try {
    [taxonomy, knowledge] = await Promise.all([
      getPublicCatalogTaxonomy(),
      listPublishedKnowledgeArticles(),
    ]);
  } catch {
    return { ok: false, reason: "taxonomy-fetch-failed" };
  }

  const { context, cart, message, history } = input;

  const priorMessages: ModelMessage[] = history
    .filter((m) => m.role !== "system")
    .slice(-10)
    .map((m) =>
      m.role === "assistant"
        ? ({ role: "assistant", content: m.text } as ModelMessage)
        : ({ role: "user", content: m.text } as ModelMessage),
    );
  const messages: ModelMessage[] = [
    ...priorMessages,
    { role: "user", content: message },
  ];

  const system = buildSystemPrompt(context, cart, taxonomy, knowledge);
  const provider = createGoogleGenerativeAI({ apiKey });

  try {
    const result = await generateText({
      model: provider(modelName),
      system,
      messages,
      output: Output.object({ schema: ofistantResponseSchema }),
      temperature: 0.2,
    });

    const out = result.output;
    if (!out) {
      return { ok: false, reason: "no-structured-output" };
    }

    const action = buildActionFromFlat(out.actionType, out.actionParam);
    const contextPatch =
      out.selectedIndustry?.trim() || action?.type === "SHOW_PRODUCTS"
        ? {
            ...(out.selectedIndustry?.trim()
              ? { selectedIndustry: out.selectedIndustry.trim() }
              : {}),
          }
        : undefined;

    const response: OfistantResponse = {
      message: out.message,
      action,
      quickReplies: out.quickReplies,
      contextPatch,
    };
    return { ok: true, response, source: "llm" };
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      return { ok: false, reason: "object-generation-failed" };
    }
    return { ok: false, reason: "generate-text-error" };
  }
}
