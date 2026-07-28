"use client";

import { Box, Eye } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import type { FloatingProductPreviewData } from "../types/product-preview.types";
import { ProductPreviewVisual } from "./ProductPreviewVisual";

interface ProductPreviewModalProps {
  data: FloatingProductPreviewData;
  open: boolean;
  has3DSupport: boolean;
  onClose: () => void;
  onOpen3D: () => void;
}

export function ProductPreviewModal({
  data,
  open,
  has3DSupport,
  onClose,
  onOpen3D,
}: ProductPreviewModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={data.product.name}
      description={`${data.color} · ${data.totalQty} pcs${data.embroideryCount ? ` · ${data.embroideryCount} titik bordir` : ""}`}
      footer={has3DSupport ? (
        <button
          type="button"
          onClick={onOpen3D}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <Eye className="h-4 w-4" aria-hidden /> Buka Preview 3D
        </button>
      ) : undefined}
    >
      <div className="space-y-3">
        <ProductPreviewVisual data={data} className="aspect-[4/3] w-full rounded-xl border border-line object-cover" />
        {data.embroideryCount > 0 && (
          <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">
            <Box className="h-4 w-4" aria-hidden /> {data.embroideryCount} titik bordir tersimpan pada konfigurasi ini.
          </p>
        )}
      </div>
    </Modal>
  );
}
