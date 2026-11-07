import type { SupportResult } from "./support.types";

export class ChatRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

// Concurrent chat requests share one refresh, avoiding refresh-token races.
let sessionCheck: Promise<Response> | null = null;
function checkSession() {
  if (!sessionCheck) {
    sessionCheck = fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(15000) })
      .finally(() => { sessionCheck = null; });
  }
  return sessionCheck.then(response => response.clone());
}

export async function chatRequest(url: string, payload?: Record<string, unknown>, customerOwner?: string): Promise<SupportResult> {
  const send = () => fetch(url, {
    method: payload ? "POST" : "GET", cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(15000),
    ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
  });
  let response = await send();
  if (response.status === 401 && customerOwner) {
    const sessionResponse = await checkSession();
    if (!sessionResponse.ok) throw new ChatRequestError("Sesi belum dapat diperiksa. Periksa koneksi, lalu coba lagi.", 503);
    const body = await sessionResponse.json();
    const session = body.session?.kind === "customer" ? body.session.session : null;
    if (!session) throw new ChatRequestError("Sesi chat perlu diperbarui. Coba lagi atau masuk kembali untuk melanjutkan.", 401);
    if (`${session.user?.id}:${session.company?.id}` !== customerOwner) {
      throw new ChatRequestError("Akun pada browser ini telah berubah. Masuk kembali dengan akun pemilik percakapan.", 401);
    }
    // Retry only once, preserving the original messageId for idempotent sends.
    response = await send();
  }
  const body = await response.json();
  if (!response.ok) throw new ChatRequestError(response.status === 401 ? "Sesi chat belum dapat digunakan. Coba lagi atau masuk kembali." : body.message || "Chat belum dapat dimuat. Coba lagi.", response.status);
  return body.result;
}
