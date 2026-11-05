import { getMerchantFeedXml } from "@/features/products/merchant-feed.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return new Response(await getMerchantFeedXml(), { headers: {
      "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response("Product feed temporarily unavailable. Please retry.", {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
}
