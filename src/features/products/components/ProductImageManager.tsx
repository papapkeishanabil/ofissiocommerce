"use client";

import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  Loader2,
  Save,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import type { AdminProductImage } from "@/features/products/woocommerce/woocommerce-product-admin.types";

import { optimizeProductImage } from "./product-image-optimization.client";

const ADMIN_HEADERS = {
  "x-ofissio-internal-role": "super_admin",
  "x-ofissio-internal-user-id": "internal-dev",
};
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 20;

interface GalleryItem {
  key: string;
  image?: AdminProductImage;
  file?: File;
  previewUrl: string;
}

interface ImagesApiResponse {
  ok?: boolean;
  message?: string;
  images?: AdminProductImage[];
  uploadedImages?: AdminProductImage[];
}

export interface ProductImageManagerHandle {
  save: (productId?: number) => Promise<AdminProductImage[]>;
}

interface ProductImageManagerProps {
  productId: number | null;
  sku: string;
  initialImages: AdminProductImage[];
  maxFileMb?: number;
  disabled?: boolean;
  onImagesChange?: (images: AdminProductImage[]) => void;
}

export const ProductImageManager = forwardRef<
  ProductImageManagerHandle,
  ProductImageManagerProps
>(function ProductImageManager(
  {
    productId,
    sku,
    initialImages,
    maxFileMb = 10,
    disabled = false,
    onImagesChange,
  },
  ref,
) {
  const primaryInputId = `${useId()}-primary`;
  const galleryInputId = `${useId()}-gallery`;
  const objectUrls = useRef(new Set<string>());
  const [items, setItems] = useState<GalleryItem[]>(() =>
    initialImages.map(remoteItem),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Memproses foto...");
  const [message, setMessage] = useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [],
  );

  async function saveImages(targetProductId = productId ?? undefined) {
    if (!targetProductId) {
      if (!items.some((item) => item.file)) return currentRemoteImages(items);
      throw new Error("Buat produk terlebih dahulu sebelum mengunggah foto.");
    }
    if (!dirty && !items.some((item) => item.file)) {
      return currentRemoteImages(items);
    }

    setBusy(true);
    setBusyLabel("Mengunggah foto...");
    setMessage(null);
    try {
      let uploadedLookup = new Map<string, AdminProductImage>();
      const pending = items.filter(
        (item): item is GalleryItem & { file: File } => Boolean(item.file),
      );
      if (pending.length > 0) {
        setMessage({
          tone: "warning",
          text: `Mengunggah ${pending.length} foto ke WordPress Media...`,
        });
        const formData = new FormData();
        pending.forEach((item) => formData.append("files", item.file));
        const uploadResponse = await fetch(
          `/api/admin/products/woocommerce/${targetProductId}/images`,
          {
            method: "POST",
            headers: { Accept: "application/json", ...ADMIN_HEADERS },
            body: formData,
          },
        );
        const uploadPayload = (await uploadResponse
          .json()
          .catch(() => null)) as ImagesApiResponse | null;
        if (!uploadResponse.ok || !uploadPayload?.images) {
          throw new Error(
            uploadPayload?.message || "Foto belum berhasil diunggah.",
          );
        }
        const persistedUploads = uploadPayload.images.slice(-pending.length);
        pending.forEach((item, index) => {
          const persisted = persistedUploads[index];
          if (persisted) uploadedLookup.set(item.key, persisted);
        });
        if (uploadedLookup.size !== pending.length) {
          throw new Error("Hasil upload foto belum dapat dicocokkan.");
        }
      }

      const finalImages = items.map((item) => {
        if (item.image) return item.image;
        const uploaded = uploadedLookup.get(item.key);
        if (!uploaded) throw new Error("Foto upload belum tersedia.");
        return uploaded;
      });
      if (pending.length > 0) {
        // The POST already persisted these images in WooCommerce. Convert the
        // local previews to remote rows now so a PATCH retry cannot duplicate
        // the upload if only ordering fails.
        releaseObjectUrls(items);
        setItems(finalImages.map(remoteItem));
      }
      setBusyLabel("Menyimpan urutan...");
      setMessage({
        tone: "warning",
        text: "Upload selesai. Menyimpan urutan foto ke WooCommerce...",
      });
      const patchResponse = await fetch(
        `/api/admin/products/woocommerce/${targetProductId}/images`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...ADMIN_HEADERS,
          },
          body: JSON.stringify({ images: finalImages }),
        },
      );
      const patchPayload = (await patchResponse
        .json()
        .catch(() => null)) as ImagesApiResponse | null;
      if (!patchResponse.ok || !patchPayload?.images) {
        throw new Error(
          patchPayload?.message || "Urutan foto belum berhasil disimpan.",
        );
      }

      releaseObjectUrls(items);
      setItems(patchPayload.images.map(remoteItem));
      setDirty(false);
      setFileErrors([]);
      setMessage({
        tone: "success",
        text: "Foto produk berhasil disimpan ke WooCommerce.",
      });
      onImagesChange?.(patchPayload.images);
      return patchPayload.images;
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Foto produk belum dapat disimpan.";
      setMessage({ tone: "error", text });
      throw error;
    } finally {
      setBusy(false);
      setBusyLabel("Memproses foto...");
    }
  }

  useImperativeHandle(ref, () => ({ save: saveImages }));

  async function addFiles(files: File[], asPrimary: boolean) {
    setFileErrors([]);
    if (!sku.trim()) {
      setFileErrors(["Isi SKU sebelum memilih foto produk."]);
      return;
    }
    const errors: string[] = [];
    const accepted: GalleryItem[] = [];
    let originalBytes = 0;
    let uploadBytes = 0;
    let optimizedCount = 0;
    setBusy(true);
    setBusyLabel("Mengoptimalkan foto...");
    setMessage({
      tone: "warning",
      text: `Mengoptimalkan ${files.length} foto sebelum upload...`,
    });

    try {
      for (const file of files) {
        const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
        if (
          !ALLOWED_EXTENSIONS.includes(extension) ||
          !ALLOWED_MIME_TYPES.includes(file.type)
        ) {
          errors.push(`${file.name}: format tidak didukung.`);
          continue;
        }
        if (file.size > maxFileMb * 1024 * 1024) {
          errors.push(`${file.name}: ukuran melebihi ${maxFileMb} MB.`);
          continue;
        }
        try {
          const stableSource = new File(
            [await file.arrayBuffer()],
            file.name,
            {
              type: file.type,
              lastModified: file.lastModified,
            },
          );
          const optimization = await optimizeProductImage(stableSource);
          const stableFile = optimization.file;
          originalBytes += optimization.originalBytes;
          uploadBytes += optimization.uploadBytes;
          if (optimization.optimized) optimizedCount += 1;

          const previewUrl = URL.createObjectURL(stableFile);
          objectUrls.current.add(previewUrl);
          accepted.push({
            key: createPendingImageKey(),
            file: stableFile,
            previewUrl,
          });
        } catch {
          errors.push(`${file.name}: file tidak dapat dibaca oleh browser.`);
        }
      }
      if (items.length + accepted.length > MAX_IMAGES) {
        accepted.forEach((item) => releaseObjectUrl(item.previewUrl));
        errors.push(`Maksimal ${MAX_IMAGES} foto per produk.`);
        setFileErrors(errors);
        setMessage(null);
        return;
      }
      if (accepted.length > 0) {
        setItems((current) =>
          asPrimary
            ? [accepted[0]!, ...current, ...accepted.slice(1)]
            : [...current, ...accepted],
        );
        setDirty(true);
        const optimizationSummary =
          optimizedCount > 0
            ? ` Ukuran upload dioptimalkan dari ${formatMegabytes(originalBytes)} menjadi ${formatMegabytes(uploadBytes)}.`
            : "";
        setMessage({
          tone: "warning",
          text: productId
            ? `${accepted.length} foto siap. Klik Simpan Foto Produk untuk mengunggah.${optimizationSummary}`
            : `${accepted.length} foto siap diunggah setelah produk dibuat.${optimizationSummary}`,
        });
      } else {
        setMessage(null);
      }
      setFileErrors(errors);
    } finally {
      setBusy(false);
      setBusyLabel("Memproses foto...");
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setDirty(true);
  }

  function setPrimary(index: number) {
    if (index === 0) return;
    setItems((current) => {
      const next = [...current];
      const [selected] = next.splice(index, 1);
      if (selected) next.unshift(selected);
      return next;
    });
    setDirty(true);
  }

  function remove(index: number) {
    const removed = items[index];
    if (removed?.file) releaseObjectUrl(removed.previewUrl);
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setDirty(true);
  }

  function releaseObjectUrl(url: string) {
    if (!objectUrls.current.has(url)) return;
    URL.revokeObjectURL(url);
    objectUrls.current.delete(url);
  }

  function releaseObjectUrls(rows: GalleryItem[]) {
    rows.forEach((row) => {
      if (row.file) releaseObjectUrl(row.previewUrl);
    });
  }

  return (
    <section aria-labelledby="product-images-title" className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 id="product-images-title" className="text-base font-black text-ink">
            Foto Produk
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
            Foto pertama menjadi foto utama katalog. Foto berikutnya tampil sebagai
            gallery di detail produk.
          </p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-800">
          {items.length}/{MAX_IMAGES} foto
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <UploadControl
          id={primaryInputId}
          title="Upload Foto Utama"
          description="Foto baru akan ditempatkan pada urutan pertama."
          multiple={false}
          disabled={disabled || busy}
          onFiles={(files) => addFiles(files, true)}
        />
        <UploadControl
          id={galleryInputId}
          title="Upload Foto Tambahan"
          description="Pilih beberapa foto untuk gallery produk."
          multiple
          disabled={disabled || busy}
          onFiles={(files) => addFiles(files, false)}
        />
      </div>

      <p className="text-xs font-semibold text-ink-muted">
        Format didukung: JPG, PNG, WEBP · Maksimal {maxFileMb} MB per file
      </p>

      {fileErrors.length > 0 ? (
        <div className="space-y-2" aria-live="polite">
          {fileErrors.map((error) => (
            <p
              key={error}
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
            >
              {error}
            </p>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
          <div>
            <ImageIcon className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-black text-ink">Belum ada foto produk.</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              Upload foto utama untuk membuat katalog lebih mudah dikenali.
            </p>
          </div>
        </div>
      ) : (
        <ol className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {/* URLs are dynamic WordPress/WooCommerce sources. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={item.image?.alt || item.file?.name || `Foto produk ${index + 1}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${index === 0 ? "bg-brand-700 text-white" : "bg-white/90 text-ink shadow-sm"}`}>
                  {index === 0 ? "Foto Utama" : `Gallery ${index}`}
                </span>
                {item.file ? (
                  <span className="absolute bottom-2 right-2 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-900">
                    Belum diupload
                  </span>
                ) : null}
              </div>
              <div className="space-y-3 p-3">
                <p className="truncate text-xs font-bold text-ink" title={item.file?.name || item.image?.name}>
                  {item.file?.name || item.image?.name || `Foto ${index + 1}`}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton
                    label="Set sebagai Foto Utama"
                    icon={Star}
                    disabled={index === 0 || busy}
                    onClick={() => setPrimary(index)}
                  />
                  <ActionButton
                    label="Hapus Foto"
                    icon={Trash2}
                    tone="danger"
                    disabled={busy}
                    onClick={() => remove(index)}
                  />
                  <ActionButton
                    label="Geser ke Atas"
                    icon={ArrowUp}
                    disabled={index === 0 || busy}
                    onClick={() => move(index, -1)}
                  />
                  <ActionButton
                    label="Geser ke Bawah"
                    icon={ArrowDown}
                    disabled={index === items.length - 1 || busy}
                    onClick={() => move(index, 1)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : message.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveImages().catch(() => undefined)}
          disabled={!productId || !dirty || busy || disabled}
          aria-busy={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-black text-white transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {busy ? busyLabel : "Simpan Foto Produk"}
        </button>
        {!productId ? (
          <p className="self-center text-xs font-semibold text-ink-muted">
            Foto akan diupload setelah tombol Buat Produk diklik.
          </p>
        ) : null}
      </div>
    </section>
  );
});

function UploadControl({
  id,
  title,
  description,
  multiple,
  disabled,
  onFiles,
}: {
  id: string;
  title: string;
  description: string;
  multiple: boolean;
  disabled: boolean;
  onFiles: (files: File[]) => Promise<void>;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex min-h-28 cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-4 transition hover:border-brand-500 hover:bg-brand-50 focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2 ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-sm">
        <UploadCloud className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-ink">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-ink-muted">{description}</span>
      </span>
      <input
        id={id}
        type="file"
        className="sr-only"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const selectedFiles = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          void onFiles(selectedFiles).catch(() => undefined);
        }}
      />
    </label>
  );
}

function ActionButton({
  label,
  icon: Icon,
  tone = "default",
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Star;
  tone?: "default" | "danger";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "danger"
          ? "border-red-100 text-red-700 hover:bg-red-50"
          : "border-slate-200 text-ink hover:border-brand-200 hover:bg-brand-50"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function createPendingImageKey() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `pending-${uuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function remoteItem(image: AdminProductImage): GalleryItem {
  return {
    key: image.id ? `image-${image.id}` : `image-${image.src}`,
    image,
    previewUrl: image.src,
  };
}

function currentRemoteImages(items: GalleryItem[]) {
  return items.flatMap((item) => (item.image ? [item.image] : []));
}

function formatMegabytes(bytes: number) {
  const decimals = bytes >= 10 * 1024 * 1024 ? 1 : 2;
  return `${(bytes / (1024 * 1024)).toFixed(decimals)} MB`;
}
