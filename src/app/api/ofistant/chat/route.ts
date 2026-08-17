// src/app/api/ofistant/chat/route.ts
// Ofistant chat endpoint (HYBRID). Runs the Gemini LLM brain when configured;
// otherwise (or on LLM failure) it transparently falls back to the existing
// rule engine server-side, fed with real catalog data.
//
// The route is ANONYMOUS-ACCESSIBLE for public catalog help. Customer-private
// questions are resolved only from a trusted session; companyId from the
// browser payload is never accepted as authorization.
//
// Response contract is always { ok: true, result: OfistantResponse, source }.

import { NextResponse } from "next/server";
import { z } from "zod";

import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { validateInput } from "@/lib/security/validate-input";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { getCurrentSession } from "@/features/auth/auth.service";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { getOfistantOrderStatusText } from "@/features/tracking/tracking.service";
import { getPublicCatalogTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { getPublicGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";
import { withCatalogSearchVocabulary } from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { searchCatalogProducts } from "@/features/catalog-taxonomy/catalog-product-search.service";
import {
  isFallbackOfistantResponse,
  respond,
} from "@/lib/ofistant/ofistant.service";
import { emptyContext, type OfistantContext } from "@/lib/ofistant/ofistant.types";
import {
  chatMessagePayloadSchema,
  generateOfistantReply,
  isOfistantLlmConfigured,
  ofistantContextPayloadSchema,
} from "@/lib/ofistant/ofistant-llm.service";
import { detectIntent } from "@/lib/ofistant/ofistant.intent";
import { createOfistantSupportHandoff } from "@/lib/ofistant/ofistant-handoff.service";
import { classifyHandoffDestination } from "@/lib/ofistant/ofistant-handoff-routing";
import { formatIDR } from "@/types/product";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(800),
  context: ofistantContextPayloadSchema.default({}),
  cart: z.object({
    itemCount: z.number(),
    totalQty: z.number(),
    totalEstimatedPrice: z.number(),
  }),
  history: z.array(chatMessagePayloadSchema).max(20).optional(),
});

export async function POST(req: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(req, "ofistant.chat"),
      limit: 20,
      windowMs: 60_000,
    });

    const body = validateInput(bodySchema, await req.json());

    // Session is OPTIONAL (anonymous OK). The sync guard can throw when the
    // configured auth provider is async — treat that as anonymous rather than
    // failing the whole request.
    let session: ReturnType<typeof getCurrentSession> = null;
    try {
      session = getCurrentSession(req);
    } catch {
      session = null;
    }
    // Never trust companyId supplied by the browser for customer-private data.
    const companyId = session?.companyId ?? null;

    const ctx: OfistantContext = {
      ...emptyContext(),
      ...body.context,
      companyId,
      companyName: session?.companyName ?? body.context.companyName ?? null,
    } as OfistantContext;

    // ---- Rule engine first (source of truth for factual answers) -------
    const taxonomy = withCatalogSearchVocabulary(
      await getPublicCatalogTaxonomy(),
    );
    const intent = detectIntent(body.message, taxonomy);
    if (
      intent.intent === "ASK_EMBROIDERY_PRICE" &&
      (intent.requestedEmbroideryZones?.length ?? 0) === 0
    ) {
      const pricing = await getPublicGlobalEmbroideryPricing();
      if (pricing.zones.length === 0) {
        return NextResponse.json({
          ok: true,
          source: "master-data",
          result: {
            message: "Saat ini Master Harga Bordir belum memiliki tarif aktif. Saya tidak akan menebak nominalnya; tim Ofissio perlu memeriksa konfigurasi harga terlebih dahulu.",
            quickReplies: ["Ya, teruskan ke CS", "Lihat katalog"],
          },
        });
      }

      const rateLines = pricing.zones.map((zone) => {
        const details: string[] = [];
        if (zone.maxWidthCm > 0 && zone.maxHeightCm > 0) {
          details.push(`maks. ${zone.maxWidthCm} × ${zone.maxHeightCm} cm`);
        }
        if (typeof zone.setupFee === "number" && zone.setupFee > 0) {
          details.push(`setup ${formatIDR(zone.setupFee)}`);
        }
        return `- ${zone.label} — ${formatIDR(zone.unitPrice)}/pcs${details.length ? ` (${details.join(", ")})` : ""}`;
      });
      return NextResponse.json({
        ok: true,
        source: "master-data",
        result: {
          message: [
            "Tarif bordir aktif saat ini per posisi:",
            ...rateLines,
            "Untuk menghitung total, sebutkan posisi bordir, jumlah pcs, dan produk yang dipilih.",
          ].join("\n"),
          quickReplies: ["Dada kiri 100 pcs", "Punggung tengah 100 pcs", "Lihat katalog"],
        },
      });
    }
    if (intent.intent === "ASK_HUMAN") {
      if (!session || !companyId) {
        return NextResponse.json({
          ok: true,
          source: "customer-data",
          result: {
            message: "Tentu, saya bisa bantu meneruskan ke tim Ofissio. Silakan masuk terlebih dahulu supaya permintaan tercatat atas nama dan perusahaan yang benar.",
            quickReplies: ["Saya akan masuk", "Kembali ke katalog"],
          },
        });
      }
      const trackingOrders = await repositoryRegistry.tracking.listTrackingByCompany(companyId);
      const current = getOfistantOrderStatusText(
        { companyId, companyName: session.companyName, currentOrderId: ctx.currentOrderId },
        trackingOrders,
      ).order;
      const requestedDestination = classifyHandoffDestination(body.message, current?.fulfillmentType);
      if (!requestedDestination) {
        return NextResponse.json({
          ok: true,
          source: "customer-data",
          result: {
            message:
              "Tentu, saya bantu arahkan ke tim yang tepat. Apakah bantuan ini terkait pesanan Ready Stock/Bordir, atau konsultasi Full Custom/Production?",
            quickReplies: [
              "Bantuan Ready Stock/Bordir",
              "Konsultasi Full Custom/Production",
              "Tanyakan dulu ke Ofistant",
            ],
          },
        });
      }
      const handoff = await createOfistantSupportHandoff({
        companyId,
        companyName: session.companyName ?? "Perusahaan customer",
        userId: session.userId,
        customerName: session.name ?? session.email ?? "Customer",
        orderId: current?.id ?? null,
        orderNumber: current?.orderNumber ?? null,
        reason: body.message,
        destination: requestedDestination.destination,
        category: requestedDestination.category,
        request: req,
      });
      const teamLabel = requestedDestination.destination === "admin" ? "Admin Ofissio" : "CS Full Custom Ofissio";
      return NextResponse.json({
        ok: true,
        source: "customer-data",
        result: {
          message: handoff.created
            ? `Baik, permintaan Anda sudah saya teruskan ke ${teamLabel} dengan nomor tiket ${handoff.ticketNumber}. ${requestedDestination.destination === "admin" ? "Admin akan memeriksa data pesanan, pembayaran, bordir, atau pengirimannya." : "CS akan membantu konsultasi desain, bahan, pola, ukuran, dan spesifikasi produksinya."}`
            : `Permintaan yang sama sudah tercatat dengan nomor tiket ${handoff.ticketNumber}, jadi saya tidak membuat tiket ganda. ${teamLabel} akan menindaklanjuti tiket tersebut.`,
          quickReplies:
            requestedDestination.destination === "admin" && current
              ? ["Buka detail pesanan", "Terima kasih"]
              : requestedDestination.destination === "cs_full_custom"
                ? ["Buka brief Full Custom", "Terima kasih"]
                : ["Terima kasih", "Kembali ke katalog"],
          action: requestedDestination.destination === "admin" && current
            ? { type: "OPEN_ORDER_TRACKING", payload: { orderId: current.id } }
            : requestedDestination.destination === "cs_full_custom"
              ? { type: "OPEN_CUSTOM_REQUEST", payload: {} }
              : undefined,
        },
      });
    }
    if (intent.intent === "ASK_TRACKING") {
      if (!session || !companyId) {
        return NextResponse.json({
          ok: true,
          source: "customer-data",
          result: {
            message: "Untuk mengecek pesanan dan pengiriman, silakan masuk terlebih dahulu agar saya hanya membuka data perusahaan Anda.",
            quickReplies: ["Saya akan masuk", "Hubungi tim Ofissio"],
          },
        });
      }
      const trackingOrders = await repositoryRegistry.tracking.listTrackingByCompany(companyId);
      const status = getOfistantOrderStatusText(
        {
          companyId,
          companyName: session.companyName,
          currentOrderId: ctx.currentOrderId,
        },
        trackingOrders,
        body.message,
      );
      return NextResponse.json({
        ok: true,
        source: "customer-data",
        result: {
          message: status.text,
          action: {
            type: "OPEN_ORDER_TRACKING",
            payload: status.order ? { orderId: status.order.id } : {},
          },
          quickReplies: status.order?.shippingTrackingNumber
            ? ["Buka detail pengiriman", "Pesanan lainnya", "Hubungi tim Ofissio"]
            : ["Buka detail pesanan", "Kapan pesanan selesai?", "Ya, teruskan ke CS"],
          contextPatch: status.order ? { currentOrderId: status.order.id } : undefined,
        },
      });
    }
    const catalogSearchResult = await searchCatalogProducts(body.message);
    const ruleResult = respond({
      text: body.message,
      ctx,
      cart: body.cart,
      taxonomy,
      catalogSearchResult,
    });

    // ---- LLM only when rules fell through to the generic fallback -----
    // (the natural-conversation turns the rules can't parse) and the LLM
    // is configured. Factual queries keep the accurate rule result.
    if (isFallbackOfistantResponse(ruleResult) && isOfistantLlmConfigured()) {
      const llm = await generateOfistantReply({
        message: body.message,
        context: ctx,
        cart: body.cart,
        history: body.history ?? [],
        companyId,
      });
      if (llm.ok) {
        return NextResponse.json({
          ok: true,
          result: llm.response,
          source: llm.source,
        });
      }
      // LLM failed: return the rule fallback (still a valid answer).
    }

    return NextResponse.json({ ok: true, result: ruleResult, source: "rules" });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Maaf, Ofistant sedang sibuk. Coba lagi sebentar.",
      500,
    );
  }
}
