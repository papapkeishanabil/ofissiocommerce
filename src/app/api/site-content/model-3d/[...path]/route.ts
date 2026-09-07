import { resolveSiteContentModel } from "@/features/site-content/site-content-model.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "site-content.glb.read"),
      limit: 120,
      windowMs: 60_000,
    });
    const { path } = await context.params;
    const storagePath = path.join("/");
    const signed = await resolveSiteContentModel(storagePath);
    const upstream = await fetch(signed.signedUrl, {
      headers: request.headers.get("range") ? { Range: request.headers.get("range")! } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!upstream.ok || !upstream.body) throw new Error("Supabase GLB download failed.");

    const headers = new Headers({
      "Content-Type": "model/gltf-binary",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return safeErrorResponse(error, "Model 3D Hero tidak tersedia.", 404);
  }
}
