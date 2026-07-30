import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function POST() {
  try {
    throw createApiError(
      "FORBIDDEN",
      "Endpoint email quotation legacy sudah dinonaktifkan. Email hanya dikirim melalui submit quotation atau action admin.",
      410,
    );
  } catch (error) {
    return safeErrorResponse(
      error,
      "Endpoint email quotation legacy sudah dinonaktifkan.",
      410,
    );
  }
}
