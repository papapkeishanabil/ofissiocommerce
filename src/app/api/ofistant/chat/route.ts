// src/app/api/ofistant/chat/route.ts
// Ofistant chat endpoint: semantic routing selects published knowledge, while
// the rule engine handles application actions and authoritative live data.
// Unresolved requests ask for clarification instead of generating business facts.
//
// The route is ANONYMOUS-ACCESSIBLE for public catalog help. Customer-private
// questions are resolved only from a trusted session; companyId from the
// browser payload is never accepted as authorization.
//
// Response contract is always { ok: true, result: OfistantResponse, source }.

import { NextResponse } from "next/server";
import { respondWithShippingRates } from "@/lib/ofistant/ofistant-shipping.service";
import { saveChatTurn } from "@/features/ofistant-history/history.chat";
import { historyTurnSchema } from "@/features/ofistant-history/history.schema";
import { respondWithPublishedKnowledge } from "@/lib/ofistant/ofistant-knowledge.service";
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

async function respondToChat(req: Request) {
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

    // Interpret policy questions before broad HELP / purchase keyword rules.
    // The model selects published evidence; the server returns official text.
    const knowledge = await respondWithPublishedKnowledge({ message: body.message, history: body.history ?? [] });
    if (knowledge.route === "reply") {
      return NextResponse.json({ ok: true, source: knowledge.source, result: knowledge.result });
    }

    // ---- System/rule paths remain authoritative for live transactional data -------
    const taxonomy = withCatalogSearchVocabulary(
      await getPublicCatalogTaxonomy(),
    );
    const intent = detectIntent(body.message, taxonomy);
    if (intent.intent !== "ASK_HUMAN" && intent.intent !== "ASK_TRACKING") {
      const shipping = await respondWithShippingRates({ message: body.message, history: body.history ?? [], context: ctx, identity: session ? { companyId: session.companyId, userId: session.userId } : null });
      if (shipping) return NextResponse.json({ ok: true, source: "shipping-system", result: shipping });
    }
    if (
      intent.intent === "ASK_EMBROIDERY_PRICE" &&
      (intent.requestedEmbroideryZones?.length ?? 0) === 0 &&
      !ctx.pendingEstimateRequest?.zones.length
    ) {
      const pricing = await getPublicGlobalEmbroideryPricing({ requireVerified: true });
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
    let catalogSearchResult = await searchCatalogProducts(body.message, { requireVerified: true });
    if (!catalogSearchResult.resultCount && ctx.selectedProductSlug &&
      !/\b[a-z]{1,6}[\s-]*\d{3,6}[a-z]{0,3}\b/i.test(body.message) &&
      (intent.intent === "ASK_QUANTITY_PRICE" || intent.intent === "ASK_EMBROIDERY_PRICE")) {
      catalogSearchResult = await searchCatalogProducts(ctx.selectedProductSlug, { requireVerified: true });
    }
    const ruleResult = respond({
      text: body.message,
      ctx,
      cart: body.cart,
      taxonomy,
      catalogSearchResult,
    });
    if ((intent.intent === "ASK_QUANTITY_PRICE" || intent.intent === "ASK_EMBROIDERY_PRICE") &&
      ruleResult.action?.type === "OPEN_PRODUCT_DETAIL") {
      const slug = ruleResult.action.payload.slug;
      const product = catalogSearchResult.products.find((p) => p.slug === slug);
      if (product) {
        ruleResult.products = [{ id: product.id, slug: product.slug, name: product.name, image: product.mainImage ?? null, material: product.material, priceFrom: product.regularPrice }];
        ruleResult.moreProductsHref = `/catalog?q=${encodeURIComponent(product.name)}`;
        ruleResult.action = undefined;
      }
    }

    // A mistaken application classification must not open a second, free-form
    // factual answer path. Unsupported operations remain a clarification.
    if (isFallbackOfistantResponse(ruleResult)) {
      return NextResponse.json({
        ok: true,
        source: "knowledge-clarification",
        result: {
          message: "Saya belum dapat memastikan maksud permintaan Anda. Boleh jelaskan hal yang ingin ditanyakan atau tindakan yang ingin dilakukan?",
          quickReplies: ["Lihat katalog", "Bantuan tim Ofissio"],
        },
      });
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


// Persist only server-generated replies, never assistant text supplied by clients.
export async function POST(req: Request) {
  const input = await req.clone().json().catch(() => null);
  let session: ReturnType<typeof getCurrentSession> = null;
  try { session = getCurrentSession(req); } catch { /* Anonymous catalog help remains available. */ }
  if (session && input?.conversationId) {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 403 });
    if (!historyTurnSchema.safeParse(input).success)
      return NextResponse.json({ ok: false, message: "Identitas percakapan tidak valid." }, { status: 400 });
  }
  const response = await respondToChat(req);
  response.headers.set("Cache-Control", "private, no-store");
  if (!response.ok) return response;
  const body = await response.json();
  if (body.ok && body.result && body.source !== "shipping-system" && input?.context?.pendingShippingRequest) {
    body.result.contextPatch = { ...body.result.contextPatch, pendingShippingRequest: null };
  }
  if (session && input?.conversationId && body.ok && body.result) {
    try {
      await saveChatTurn(session, input, body.result);
      body.historySaved = true;
    } catch {
      body.historySaved = false;
    }
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
