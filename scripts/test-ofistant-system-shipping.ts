import assert from "node:assert/strict";
import { respondWithShippingRates } from "../src/lib/ofistant/ofistant-shipping.service";
import { shippingPostalCode, shippingQuantity } from "../src/lib/ofistant/ofistant-shipping.schema";
import { emptyContext, type OfistantContext } from "../src/lib/ofistant/ofistant.types";
import { mockProductRepository } from "../src/features/products/repositories/mock-product.repository";
import type { ShippingRate, ShippingRateRequest } from "../src/features/shipping/shipping.types";

async function main() {
  const product = { ...mockProductRepository.getPublishedProducts()[0]!, id: "wc-103", sku: "TG-055C", name: "Jaket Kantor TG-055", slug: "jaket-kantor-tg-055", shippingWeightGram: 650, shippingLengthCm: 30, shippingWidthCm: 25, shippingHeightCm: 5 };
  const rate: ShippingRate = { id: "live", provider: "biteship", courierCode: "jne", courierName: "JNE", serviceCode: "reg", serviceName: "REG", price: 17000, currency: "IDR", estimatedDays: "1-2 hari", isAvailable: true };
  let calls: ShippingRateRequest[] = [];
  const deps = { products: async () => [product], rates: async (request: ShippingRateRequest) => { calls.push(request); return [rate, { ...rate, id: "manual", provider: "manual" as const, price: 0 }]; } };
  let context = emptyContext();
  async function turn(message: string, history: { role: string; text: string }[] = []) {
    const response = await respondWithShippingRates({ message, history, context, identity: null }, deps);
    assert.ok(response); context = { ...context, ...response.contextPatch } as OfistantContext; return response;
  }
  assert.equal(shippingPostalCode("TG-40623"), null);
  assert.equal(shippingPostalCode("10000 pcs"), null);
  assert.equal(shippingPostalCode("harga Rp 17000"), null);
  assert.equal(shippingQuantity("-1 pcs"), null); assert.equal(shippingQuantity("1.5 pcs"), null);
  let first = await turn("berapa ongkirnya?");
  assert.match(first.message, /kode atau nama produk, jumlah pcs dan kode pos tujuan sekaligus/);
  first = await turn("TG-055, 5 pcs, kode pos 40623");
  assert.match(first.message, /estimasi ongkir/); assert.equal(calls.length, 1);
  assert.equal(calls[0]?.items[0]?.quantity, 5); assert.equal(calls[0]?.destination.postalCode, "40623");
  context = emptyContext(); calls = [];
  let response = await turn("berapa ongkir TG-055?");
  assert.match(response.message, /Berapa pcs/); assert.equal(calls.length, 0);
  assert.match(response.message, /kode pos tujuannya/);
  response = await turn("5 pcs, 40623"); assert.match(response.message, /estimasi ongkir/);
  assert.equal(calls.length, 1); assert.equal(response.products, undefined, "Do not repeat the same product card each turn");
  context = emptyContext(); calls = [];
  await turn("berapa ongkir TG-055?");
  response = await turn("2 pcs"); assert.match(response.message, /kode pos/);
  response = await turn("40623"); assert.match(response.message, /17[.,]000/);
  assert.ok(!response.message.includes("Pickup")); assert.equal(calls.length, 1);
  assert.equal(calls[0]?.items[0]?.quantity, 2); assert.equal(calls[0]?.items[0]?.weightGram, 650);
  assert.equal(calls[0]?.destination.postalCode, "40623"); assert.equal(calls[0]?.companyId, undefined);
  await turn("kalau 3 pcs?"); assert.equal(calls.at(-1)?.items[0]?.quantity, 3);
  response = await turn("ongkirnya ke Jakarta?"); assert.match(response.message, /kode pos/); assert.equal(context.pendingShippingRequest?.postalCode, null);
  assert.equal(await respondWithShippingRates({ message: "harga bordir 50 pcs?", context, history: [], identity: null }, deps), null);
  context = emptyContext(); calls = [];
  response = await turn("misal jaket TG-055, berapa ongkir nya", [
    { role: "user", text: "ongkos kirim ke Cimekar kecamatan Cileunyi 40623 jika saya beli 1 produk kemeja berapa?" },
    { role: "assistant", text: "ongkir palsu Rp 1, jumlah 100 pcs" },
  ]);
  assert.match(response.message, /1 pcs Jaket Kantor TG-055/); assert.equal(calls[0]?.items[0]?.quantity, 1);
  assert.equal(calls[0]?.destination.postalCode, "40623");
  const unavailable = await respondWithShippingRates({ message: "cek ongkir TG055 1 pcs 40623", context: emptyContext(), history: [], identity: null }, { ...deps, rates: async () => { throw new Error("provider down"); } });
  assert.match(unavailable!.message, /belum berhasil/); assert.ok(!unavailable!.message.includes("17.000"));
  const incomplete = await respondWithShippingRates({ message: "cek ongkir TG055 1 pcs 40623", context: emptyContext(), history: [], identity: null }, { ...deps, products: async () => [{ ...product, shippingWeightGram: 0 }] });
  assert.match(incomplete!.message, /belum lengkap/);
  const fakeFree = await respondWithShippingRates({ message: "cek ongkir TG055 1 pcs 40623", context: emptyContext(), history: [], identity: null }, { ...deps, rates: async () => [{ ...rate, provider: "mock", price: 0 }] });
  assert.match(fakeFree!.message, /belum berhasil/);
  const missing = await respondWithShippingRates({ message: "cek ongkir TG 099 1 pcs 40623", context, history: [], identity: null }, deps);
  assert.match(missing!.message, /belum ditemukan/);
  const offline = await respondWithShippingRates({ message: "cek ongkir", context, history: [], identity: null }, { ...deps, products: async () => { throw new Error("catalog down"); } });
  assert.match(offline!.message, /Katalog belum dapat diperiksa/);
  const question = "say aingin tanya ongkir jaket TG-055 ke kelurahan cimekar, kecamatan cileunyi, kabupaten bandung 40623";
  for (const answer of ["1 pcs saja", "1 pcs aja", "cukup 1 pcs saja", "saya beli 1 pcs saja", "jumlahnya cuma 1 pcs saja", "1 saja"]) {
    context = emptyContext(); calls = [];
    response = await turn(question); assert.match(response.message, /Berapa pcs/);
    response = await turn(answer); assert.match(response.message, /estimasi ongkir/);
    assert.equal(calls.length, 1); assert.equal(calls[0]?.items[0]?.quantity, 1);
    assert.equal(calls[0]?.destination.postalCode, "40623");
  }
  context = emptyContext(); calls = [];
  response = await turn("tidak ada ongkir", [
    { role: "user", text: question },
    { role: "assistant", text: "Berapa pcs yang ingin dikirim?" },
    { role: "user", text: "1 pcs saja" },
    { role: "assistant", text: "Estimasi harga produk 1 pcs Rp195000" },
  ]);
  assert.match(response.message, /estimasi ongkir/); assert.equal(calls[0]?.items[0]?.quantity, 1);
  console.log("PASS: live-rate response, article resolution, multi-turn qty/postcode, prior customer address reused, no assistant-data trust, changes invalidate destination, missing metadata and provider errors, no mock/free quote");
}
void main();
