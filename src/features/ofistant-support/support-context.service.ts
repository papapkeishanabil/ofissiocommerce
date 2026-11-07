import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { getDatabaseRuntimeConfig } from "@/features/database/database.config";
import { getSizeChartStandards } from "@/features/size-charts/size-chart.service";
import { productServerService } from "@/features/products/product.server-service";
import { woocommerceProductRepository } from "@/features/products/repositories/woocommerce-product.repository";
import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { validateProductForCatalog } from "@/features/products/product.validation";
import { getStorageRuntimeConfig } from "@/features/storage/storage.config";
import { uploadManagedStorageObject, getManagedStorageObjectSignedUrl, deleteManagedStorageObject } from "@/features/storage/storage.service";
import { createApiError } from "@/lib/security/safe-error-response";
import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import type { ChatAttachment, ChatCustomerContext, ChatMaterial } from "./support-context.types";

async function publishedChatProducts() {
  return getCommerceRuntimeConfig().productSource === "woocommerce" ? woocommerceProductRepository.getPublishedProducts() : productServerService.getPublishedProducts();
}
async function verifiedCharts() {
  const state = await getSizeChartStandards();
  return state.source === "supabase" ? state.standards.filter(c => c.verified === true && c.rows.length > 0) : [];
}
export function contextDb() {
  const db = getSupabaseAdminClient();
  if (!db) throw createApiError("PROVIDER_UNAVAILABLE");
  return db;
}
export async function contextOwner(conversationId: string) {
  const db = contextDb();
  const [owners, sessions] = await Promise.all([
    db.select("ofistant_conversations", { filters: { id: conversationId }, limit: 1 }),
    db.select("ofistant_support_sessions", { filters: { conversation_id: conversationId }, limit: 1 }),
  ]);
  if (!owners[0] || !sessions[0]) throw createApiError("NOT_FOUND", "Percakapan tidak ditemukan.");
  return { userId: String(owners[0].user_id), companyId: String(owners[0].company_id), name: String(sessions[0].customer_name) };
}
export async function customerContext(id: string, offset = 0): Promise<ChatCustomerContext> {
  const owner = await contextOwner(id); const db = contextDb();
  const [profiles, contacts, orders] = await Promise.all([
    db.select("user_profiles", { select: "name,email,whatsapp", filters: { id: owner.userId }, limit: 1 }),
    db.select("ofistant_customer_contacts", { filters: { user_id: owner.userId }, limit: 1 }),
    db.select("orders", { select: "order_json", filters: { company_id: owner.companyId, user_id: owner.userId }, order: "created_at.desc,id.desc", limit: 21, offset }),
  ]);
  const profile = profiles[0]; const contact = contacts[0];
  return {
    profile: { name: String(contact?.name ?? owner.name), email: String(profile?.email ?? ""), whatsapp: String(contact?.whatsapp ?? profile?.whatsapp ?? ""), notes: String(contact?.notes ?? "") },
    moreOrders: orders.length > 20,
    orders: orders.slice(0, 20).map(row => row.order_json as unknown as PaymentOrderRecord).filter(order => order?.userId === owner.userId && order.companyId === owner.companyId).map(order => ({ id: order.id, number: order.orderNumber || order.id, status: order.processStatus || order.status, date: order.createdAt, total: order.calculation.grandTotal, products: order.items.map(item => item.productName) })),
  };
}
export async function updateChatContact(id: string, profile: { name: string; whatsapp: string; notes: string }, actor: string) {
  const config = getDatabaseRuntimeConfig();
  const response = await fetch(new URL("/rest/v1/rpc/ofistant_contact_update", config.supabase.url), { method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000), headers: { apikey: config.supabase.serviceRoleKey, Authorization: `Bearer ${config.supabase.serviceRoleKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_conversation: id, p_name: profile.name, p_whatsapp: profile.whatsapp, p_notes: profile.notes, p_actor: actor }) });
  if (!response.ok) throw createApiError("PROVIDER_UNAVAILABLE", "Informasi customer belum dapat disimpan.");
}
export async function chatProducts(query: string) {
  // Use the live commerce repository; only publishable products can be recommended.
  const products = await publishedChatProducts();
  const q = query.trim().toLocaleLowerCase("id-ID");
  return products.filter(p => validateProductForCatalog(p).ok && `${p.name} ${p.sku}`.toLocaleLowerCase("id-ID").includes(q)).slice(0, 40).map(p => ({ id: p.id, title: p.name, price: p.priceFrom, url: `/product/${encodeURIComponent(p.slug)}`, image: p.mainImage ?? undefined }));
}
export async function chatMaterials() {
  const [rows, charts] = await Promise.all([
    contextDb().select("ofistant_materials", { filters: { active: true }, order: "created_at.desc", limit: 200 }),
    verifiedCharts(),
  ]);
  return [
    ...charts.map(c => ({ id: `chart:${c.id}`, title: c.name, category: "Ukuran", kind: "chart" as const, active: true })),
    ...rows.map(r => ({ id: String(r.id), title: String(r.title), category: String(r.category), kind: r.kind as ChatMaterial["kind"], active: true })),
  ];
}
export async function prepareChatAttachment(kind: "product" | "material", id: string, actor: string): Promise<ChatAttachment> {
  if (kind === "product") {
    const product = (await publishedChatProducts()).find(p => p.id === id && validateProductForCatalog(p).ok);
    if (!product) throw createApiError("NOT_FOUND", "Produk tidak tersedia.");
    return { kind: "product", title: product.name, price: product.priceFrom, url: `/product/${encodeURIComponent(product.slug)}`, image: product.mainImage ?? undefined };
  }
  if (id.startsWith("chart:")) {
    const chart = (await verifiedCharts()).find(c => c.id === id.slice(6) && c.verified === true && c.rows.length > 0);
    if (!chart) throw createApiError("NOT_FOUND", "Standar ukuran belum diverifikasi.");
    const resourceId = randomUUID();
    await contextDb().insert("ofistant_materials", { id: resourceId, title: chart.name, category: "Ukuran", kind: "chart", data: chart, active: false, created_by: actor });
    return { kind: "chart", title: chart.name, resourceId };
  }
  const rows = await contextDb().select("ofistant_materials", { filters: { id, active: true }, limit: 1 });
  const row = rows[0];
  if (!row) throw createApiError("NOT_FOUND", "Materi tidak tersedia.");
  return { kind: row.kind as ChatAttachment["kind"], title: String(row.title), resourceId: String(row.id) };
}
export async function uploadChatMaterial(file: File, title: string, category: string, actor: string) {
  if (!file.size || file.size > 10 * 1024 * 1024) throw createApiError("BAD_REQUEST", "Batas file 10 MB.");
  const storage = getStorageRuntimeConfig();
  if (storage.provider === "mock") throw createApiError("PROVIDER_UNAVAILABLE", "Penyimpanan materi belum tersedia.");
  let data = Buffer.from(await file.arrayBuffer());
  let kind: "image" | "pdf" = "image"; let mime = "image/png";
  if (file.type === "application/pdf" && data.subarray(0, 5).toString() === "%PDF-") { kind = "pdf"; mime = file.type; }
  else {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw createApiError("BAD_REQUEST", "Gunakan PNG, JPG, WebP, atau PDF.");
    data = await sharp(data, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  }
  const id = randomUUID(); const key = `chat-materials/${id}.${kind === "pdf" ? "pdf" : "png"}`;
  await uploadManagedStorageObject({ bucket: storage.buckets.documents, key, data, mimeType: mime });
  try { await contextDb().insert("ofistant_materials", { id, title, category, kind, storage_key: key, mime_type: mime, created_by: actor }); }
  catch (error) { await deleteManagedStorageObject({ bucket: storage.buckets.documents, key }).catch(() => {}); throw error; }
  return id;
}
const escapeXml = (value: unknown) => String(value ?? "").replace(/[<>&"']/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char]!));
export async function materialResponse(id: string) {
  let row: Record<string, unknown> | undefined;
  if (id.startsWith("chart:")) {
    const chart = (await verifiedCharts()).find(c => c.id === id.slice(6) && c.verified === true);
    if (chart) row = { kind: "chart", data: chart };
  } else row = (await contextDb().select("ofistant_materials", { filters: { id }, limit: 1 }))[0];
  if (!row) throw createApiError("NOT_FOUND");
  if (row.kind === "chart") {
    const chart = row.data as { name: string; rows: Record<string, unknown>[] };
    const columns = [["size", "Ukuran"], ["chest", "Dada"], ["length", "Badan"], ["shoulder", "Bahu"], ["sleeveLength", "Lengan"], ["upperArm", "L. atas"], ["elbow", "Siku"], ["lowerArm", "L. bawah"], ["height", "TB (cm)"], ["weightMin", "BB min (kg)"], ["weightMax", "BB max (kg)"]].filter(([key]) => key === "size" || chart.rows.some(r => Number(r[key!]) > 0));
    const width = Math.max(800, columns.length * 130); const height = 190 + chart.rows.length * 48;
    const text = (x: number, y: number, value: unknown, color = "#122162") => `<text x="${x}" y="${y}" fill="${color}" font-family="sans-serif" font-size="20">${escapeXml(value)}</text>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/>${text(24, 38, chart.name)}${text(24, 70, "Standar ukuran Ofissio · ukuran pakaian dalam cm")}${columns.map(([, label], i) => text(24 + i * 125, 115, label)).join("")}${chart.rows.map((r, j) => columns.map(([key], i) => text(24 + i * 125, 160 + j * 48, r[key!] || "—")).join("")).join("")}</svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
  const url = await getManagedStorageObjectSignedUrl({ bucket: getStorageRuntimeConfig().buckets.documents, key: String(row.storage_key), mimeType: String(row.mime_type) });
  return new Response(null, { status: 302, headers: { Location: url.signedUrl, "Cache-Control": "private, no-store" } });
}
