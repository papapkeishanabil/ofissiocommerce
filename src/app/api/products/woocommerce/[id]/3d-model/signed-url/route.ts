import { NextResponse } from "next/server";

import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import { resolvePublishedProductGlb } from "@/features/products/woocommerce/woocommerce-product-glb.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "product.glb.signed-url"),
      limit: 90,
      windowMs: 60_000,
    });
    const { id } = validateInput(adminWooProductIdParamSchema, await context.params);
    const signed = await resolvePublishedProductGlb({ productId: id, request });
    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.get("content") === "1") {
      // Timeout stream harus menampung GLB besar pada throughput lambat:
      // TG-055 (15,2 MB) @ ~0,16 MB/s butuh ±95 detik — 30 detik memotong
      // stream di tengah dan loader 3D di browser gagal. 180s ≈ ruang untuk
      // ±28 MB; rate limit 90 req/menit di atas tetap menjaga penyalahgunaan.
      const upstream = await fetch(signed.url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(180_000),
      });
      if (!upstream.ok || !upstream.body) {
        throw new Error("Supabase GLB download failed.");
      }
      const responseHeaders = new Headers({
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "private, max-age=600",
        "X-Content-Type-Options": "nosniff",
      });
      const contentLength = upstream.headers.get("content-length");
      if (contentLength) responseHeaders.set("Content-Length", contentLength);
      return new Response(upstream.body, {
        status: 200,
        headers: responseHeaders,
      });
    }
    // v = token versi objek (key + ukuran). Upload GLB baru menghasilkan token
    // baru → URL konten berubah → cache HTTP browser (max-age=600) dilewati
    // tanpa mengorbankan caching untuk model yang tidak berubah.
    const sameOriginModelUrl = `${requestUrl.pathname}?content=1&v=${encodeURIComponent(signed.versionToken)}`;
    return NextResponse.json(
      { ok: true, url: sameOriginModelUrl, expiresAt: signed.expiresAt },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeErrorResponse(error, "Model 3D produk belum tersedia.", 404);
  }
}
