import { z } from "zod";

export const shippingConversationSchema = z.object({
  productId: z.string().max(120).nullable(),
  quantity: z.number().int().min(1).max(100000).nullable(),
  postalCode: z.string().regex(/^[1-9]\d{4}$/).nullable(),
  stage: z.enum(["collecting", "quoted", "unavailable"]),
});
export type ShippingConversation = z.infer<typeof shippingConversationSchema>;

export function shippingQuantity(text: string): number | null {
  if (/-\s*\d+\s*(?:pcs|pc|buah|potong|produk)\b|\d+[.,]\d+\s*(?:pcs|pc|buah|potong|produk)\b/i.test(text)) return null;
  const explicit = text.match(/\b(\d{1,6})\s*(?:pcs|pc|buah|potong|produk|kemeja|jaket)\b/i);
  const bare = text.trim().match(/^(?:(?:saya|aku|mau|ingin|beli|cukup|hanya|jumlah(?:nya)?|total(?:nya)?|kalau|kalo|jadi|untuk|coba)\s+){0,5}(\d{1,4})(?:\s+(?:saja|aja|dulu|ya|yah|pak|bu|kak|dong)){0,5}[?.!\s]*$/i);
  const value = Number(explicit?.[1] ?? bare?.[1]);
  return Number.isInteger(value) && value > 0 && value <= 100000 ? value : null;
}

export function shippingPostalCode(text: string): string | null {
  const addressText = text.replace(/\brp\.?\s*[\d.,]+/gi, "");
  const values = [...addressText.matchAll(/(?<![a-z\d-])([1-9]\d{4})(?!\d|\s*(?:pcs|pc|buah|potong|produk)\b)/gi)].map((m) => m[1]!);
  return new Set(values).size === 1 ? values[0]! : null;
}

export function shippingFollowUp(text: string) {
  if (/\b(bordir|harga|keranjang|checkout|pesan|bayar|stok|stock|bahan|produksi|rekomendasi|bandingkan)\b/i.test(text)) return false;
  if (shippingPostalCode(text)) return true;
  // Resume the pending shipping task when a valid quantity is supplied,
  // even inside a natural sentence such as "jumlahnya cuma 1 pcs saja".
  if (shippingQuantity(text) !== null) return true;
  return /^(?:(?:kalau|kalo|jadi|untuk|coba|ke|kode\s*pos(?:nya)?|pos)\s+)?\d{1,6}(?:\s*(?:pcs|pc|buah|potong|produk))?[?.!\s]*$/i.test(text.trim()) ||
    /^(?:(?:produk|pilih|misal|contoh|yang|jaket|kemeja)\s+)*[a-z]{1,6}[\s-]*\d{3,6}[a-z]{0,3}[?.!\s]*$/i.test(text.trim());
}
