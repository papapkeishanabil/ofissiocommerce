import { resolveSiteContentVideo, videoMimeFromPath } from "@/features/site-content/site-content-video.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "site-content.video.read"),
      limit: 180,
      windowMs: 60_000,
    });
    const { path } = await context.params;
    const storagePath = path.join("/");
    const signed = await resolveSiteContentVideo(storagePath);
    const range = request.headers.get("range");
    const upstream = await fetch(signed.signedUrl, {
      headers: range ? { Range: range } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
      throw new Error("Supabase video download failed.");
    }

    const headers = new Headers({
      "Content-Type": videoMimeFromPath(storagePath),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return safeErrorResponse(error, "Video tidak tersedia.", 404);
  }
}
