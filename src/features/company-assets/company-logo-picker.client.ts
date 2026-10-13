import type { AuthSession } from "@/types/account";
import type { CompanyLogoAsset } from "./company-assets.types";

export interface StudioLibraryLogo {
  fileId: string;
  fileName: string;
  previewUrl: string;
  aspectRatio: number;
}

type Fetcher = typeof fetch;
type ReadDimensions = (url: string, signal: AbortSignal) => Promise<{ width: number; height: number }>;
type LogoPickerSession = {
  company: Pick<AuthSession["company"], "id" | "companyName">;
  user: Pick<AuthSession["user"], "id" | "email" | "fullName" | "role">;
};

function authHeaders(session: LogoPickerSession): HeadersInit {
  return {
    "x-ofissio-company-id": session.company.id,
    "x-ofissio-company-name": session.company.companyName,
    "x-ofissio-user-id": session.user.id,
    "x-ofissio-user-email": session.user.email,
    "x-ofissio-user-name": session.user.fullName,
    "x-ofissio-role": session.user.role,
  };
}

function usableLogo(logo: CompanyLogoAsset, companyId: string) {
  return logo.companyId === companyId && Boolean(logo.fileId) &&
    (logo.fileType === "company_logo" || logo.fileType === "embroidery_logo") &&
    ["uploaded", "validated", "used"].includes(logo.status) &&
    ["image/png", "image/jpeg", "image/svg+xml"].includes(logo.mimeType);
}

export async function loadCompanyLogoChoices({ session, signal, fetcher = fetch }: {
  session: LogoPickerSession; signal: AbortSignal; fetcher?: Fetcher;
}): Promise<CompanyLogoAsset[]> {
  const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
  boundedSignal.throwIfAborted();
  const response = await fetcher("/api/company/logos", {
    headers: authHeaders(session), credentials: "same-origin", cache: "no-store", signal: boundedSignal,
  });
  const body = await response.json().catch(() => null);
  boundedSignal.throwIfAborted();
  if (!response.ok || body?.ok !== true || !Array.isArray(body.logos)) {
    throw new Error(response.status === 401
      ? "Sesi login telah berakhir. Silakan masuk kembali."
      : "Logo Library belum dapat dimuat. Silakan coba lagi.");
  }
  return body.logos.filter((logo: CompanyLogoAsset | null) =>
    logo && typeof logo === "object" && usableLogo(logo, session.company.id));
}

function readImageDimensions(url: string, signal: AbortSignal) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    signal.throwIfAborted();
    const image = new Image();
    function cleanup() {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
    }
    function abort() {
      cleanup();
      image.src = "";
      reject(signal.reason);
    }
    image.onload = () => {
      cleanup();
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("Gambar logo belum dapat dibuka. Coba pilih kembali."));
    };
    signal.addEventListener("abort", abort, { once: true });
    // Preview and the 3D texture must both be readable across origins.
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

export async function resolveCompanyLogoChoice({ logo, session, signal, fetcher = fetch, readDimensions = readImageDimensions }: {
  logo: CompanyLogoAsset; session: LogoPickerSession; signal: AbortSignal;
  fetcher?: Fetcher; readDimensions?: ReadDimensions;
}): Promise<StudioLibraryLogo> {
  if (!usableLogo(logo, session.company.id)) throw new Error("Logo ini tidak dapat digunakan oleh akun Anda.");
  const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
  boundedSignal.throwIfAborted();
  const previewUrl = await requestCompanyLogoPreview({ fileId: logo.fileId, session, signal: boundedSignal, fetcher });
  const { width, height } = await readDimensions(previewUrl, boundedSignal);
  boundedSignal.throwIfAborted();
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Dimensi logo tidak dapat dibaca.");
  }
  return {
    fileId: logo.fileId, fileName: logo.originalFilename,
    previewUrl, aspectRatio: width / height,
  };
}

/** Selection and reopening must use the same cookie-authenticated image path. */
export async function requestCompanyLogoPreview({ fileId, session, signal, fetcher = fetch }: {
  fileId: string; session: LogoPickerSession; signal: AbortSignal; fetcher?: Fetcher;
}): Promise<string> {
  const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
  boundedSignal.throwIfAborted();
  const response = await fetcher(`/api/files/${encodeURIComponent(fileId)}/signed-url?preview=1`, {
    headers: authHeaders(session), credentials: "same-origin", cache: "no-store", signal: boundedSignal,
  });
  const body = await response.json().catch(() => null);
  boundedSignal.throwIfAborted();
  if (!response.ok || body?.ok !== true || body.fileId !== fileId || typeof body.signedUrl !== "string" || !body.signedUrl) {
    throw new Error(response.status === 401
      ? "Sesi login telah berakhir. Silakan masuk kembali."
      : "Logo belum dapat digunakan. Muat ulang Logo Library dan coba lagi.");
  }
  return body.signedUrl;
}
