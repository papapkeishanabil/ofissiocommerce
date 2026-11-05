import "server-only";
import { resolveProductReferences } from "@/features/catalog-taxonomy/catalog-product-reference";
import type { OfissioProduct } from "@/features/products/product.types";
import { getLiveShippingRatesForProducts } from "@/features/shipping/providers/biteship-checkout-shipping.provider";
import { getShippingRuntimeConfig } from "@/features/shipping/shipping.config";
import type { ShippingRate, ShippingRateRequest } from "@/features/shipping/shipping.types";
import { formatIDR } from "@/types/product";
import { getVerifiedOfistantProducts } from "./ofistant-catalog.service";
import { isShippingQuestion } from "./ofistant.intent";
import { shippingConversationSchema, shippingFollowUp, shippingPostalCode, shippingQuantity, type ShippingConversation } from "./ofistant-shipping.schema";
import type { OfistantContext, OfistantResponse } from "./ofistant.types";

interface Input {
  message: string;
  history: { role: string; text: string }[];
  context: OfistantContext;
  identity: { companyId: string; userId: string } | null;
}
interface Dependencies {
  products: () => Promise<OfissioProduct[]>;
  rates: (request: ShippingRateRequest, products: OfissioProduct[]) => Promise<ShippingRate[]>;
}
const defaults: Dependencies = { products: getVerifiedOfistantProducts, rates: (request, products) => getLiveShippingRatesForProducts(request, products, { requireVerifiedSettings: true }) };

export async function respondWithShippingRates(input: Input, deps: Dependencies = defaults): Promise<OfistantResponse | null> {
  const prior = shippingConversationSchema.safeParse(input.context.pendingShippingRequest);
  const pending = prior.success ? prior.data : null;
  const explicit = isShippingQuestion(input.message);
  const retry = /^(?:coba lagi|cek ulang|ulangi(?: cek ongkir)?)[?.!\s]*$/i.test(input.message.trim());
  if (!explicit && !(pending && (shippingFollowUp(input.message) || retry))) return null;

  const draft: ShippingConversation = pending ? { ...pending, stage: "collecting" } : { productId: null, quantity: null, postalCode: null, stage: "collecting" };
  let products: OfissioProduct[];
  try { products = await deps.products(); }
  catch { return { message: "Katalog belum dapat diperiksa saat ini. Saya belum bisa menghitung ongkir. Silakan coba lagi.", contextPatch: { pendingShippingRequest: { ...draft, stage: "unavailable" } } }; }

  // Use only customer inputs from the latest shipping discussion. Never use
  // assistant text as proof of an address, quantity, tariff, or product price.
  const userHistory = input.history.filter((m) => m.role === "user").slice(-10);
  const shippingStart = userHistory.findLastIndex((m) => isShippingQuestion(m.text));
  const earlier = !pending && shippingStart >= 0 ? userHistory.slice(shippingStart).filter((m) => isShippingQuestion(m.text) || shippingFollowUp(m.text)) : [];
  const relevant = [...earlier.map((m) => m.text), input.message];
  let ambiguous = false;
  let unknownCode = false;
  for (const text of relevant) {
    const references = resolveProductReferences(products, text);
    const codePresent = references.length === 0 && /\b(?!(?:pos|kode|blok|nomor|telp|ke|pcs|pc|buah|qty|jumlah)[\s-]*\d)[a-z]{1,4}[\s-]*\d{3,6}[a-z]{0,3}\b/i.test(text);
    if (references.length === 1) { draft.productId = references[0]!.id; unknownCode = false; ambiguous = false; }
    else if (references.length > 1) { ambiguous = true; draft.productId = null; }
    else if (codePresent) { draft.productId = null; unknownCode = true; }
    const quantity = shippingQuantity(text);
    if (quantity !== null) draft.quantity = quantity;
    else if (/[-\d.,]+\s*(?:pcs|pc|buah|potong|produk)\b/i.test(text)) draft.quantity = null;
    const postal = shippingPostalCode(text);
    if (postal) draft.postalCode = postal;
    else if (/\bke\s+\S+|\b(?:alamat|kode\s*pos|kota|kabupaten|kecamatan)\b/i.test(text)) draft.postalCode = null;
  }
  // Product context is a hint only; verify it against the current catalogue.
  if (!draft.productId && !unknownCode && !ambiguous && input.context.selectedProductSlug) {
    draft.productId = products.find((p) => p.slug === input.context.selectedProductSlug)?.id ?? null;
  }
  const product = products.find((p) => p.id === draft.productId);
  if (!product) draft.productId = null;
  const contextPatch = { pendingShippingRequest: draft };
  if (!product) return {
    message: ambiguous ? "Saya menemukan beberapa produk. Sebutkan satu kode produk yang ingin dihitung beserta jumlah pcs-nya terlebih dahulu."
      : unknownCode ? "Kode produk tersebut belum ditemukan di katalog. Boleh periksa kembali kodenya agar ongkir dihitung untuk produk yang benar?"
      : "Saya bantu cek ongkir. Produk apa yang ingin dikirim? Cukup sebutkan kodenya, misalnya TG-055 atau KK-011.",
    contextPatch,
  };
  const card = { id: product.id, slug: product.slug, name: product.name, image: product.mainImage ?? null, material: product.material, priceFrom: product.priceFrom };
  const replyBase = { products: [card], moreProductsHref: `/catalog?q=${encodeURIComponent(product.name)}`, contextPatch: { ...contextPatch, selectedProductId: product.id, selectedProductSlug: product.slug } };
  if (!draft.quantity) return { ...replyBase, message: `Produk yang dimaksud adalah ${product.name}. Berapa pcs yang ingin dikirim?` };
  if (!draft.postalCode) return { ...replyBase, message: `Saya cek ongkir untuk ${draft.quantity} pcs ${product.name}. Berapa kode pos tujuan pengirimannya?` };

  try {
    const weight = product.shippingWeightGram;
    const measurements = [weight, product.shippingLengthCm, product.shippingWidthCm, product.shippingHeightCm];
    if (measurements.some((n) => typeof n !== "number" || !Number.isFinite(n) || n <= 0)) {
      return { ...replyBase, message: `Produk ${product.name} sudah ditemukan, tetapi data berat atau dimensi pengirimannya belum lengkap. Tim Ofissio perlu melengkapinya sebelum saya dapat menghitung ongkir.`, contextPatch: { ...replyBase.contextPatch, pendingShippingRequest: { ...draft, stage: "unavailable" } } };
    }
    const rates = await deps.rates({
      ...(input.identity ? { companyId: input.identity.companyId, userId: input.identity.userId } : {}),
      origin: getShippingRuntimeConfig().defaultOrigin,
      destination: { city: `Kode pos ${draft.postalCode}`, postalCode: draft.postalCode },
      items: [{ productId: product.id, quantity: draft.quantity, weightGram: weight! }],
    }, [product]);
    // Manual/mock zero-price rows must never be presented as free delivery.
    const valid = rates.filter((r) => r.provider === "biteship" && r.isAvailable && r.currency === "IDR" && Number.isFinite(r.price) && r.price >= 0)
      .sort((a, b) => a.price - b.price);
    if (!valid.length) throw new Error("No live courier rate");
    return {
      ...replyBase,
      message: [
        `Berikut estimasi ongkir untuk ${draft.quantity} pcs ${product.name} ke kode pos ${draft.postalCode}:`,
        ...valid.slice(0, 5).map((r) => {
          const duration = r.estimatedDays.replace(/\bdays?\b/gi, "hari").replace(/\bhours?\b/gi, "jam").replace(/^(\d+)\s*-\s*\1\b/, "$1");
          return `- ${r.courierName} ${r.serviceName}: ${formatIDR(r.price)}${duration ? ` (${duration})` : ""}`;
        }),
        "Tarif ini diperiksa dari sistem pengiriman. Tarif akhir akan diperiksa kembali saat checkout.",
      ].join("\n"),
      contextPatch: { ...replyBase.contextPatch, pendingShippingRequest: { ...draft, stage: "quoted" } },
    };
  } catch {
    return { ...replyBase, message: `Saya sudah mengenali ${draft.quantity} pcs ${product.name} dan tujuan kode pos ${draft.postalCode}, tetapi tarif kurir belum berhasil diperoleh. Silakan coba lagi; saya belum dapat memastikan nominal ongkirnya.`, quickReplies: ["Coba lagi", "Hubungi CS Ofissio"], contextPatch: { ...replyBase.contextPatch, pendingShippingRequest: { ...draft, stage: "unavailable" } } };
  }
}
