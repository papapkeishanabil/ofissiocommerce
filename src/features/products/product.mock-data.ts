import { PRODUCTS } from "@/data/products";
import type { OfissioProduct, Product3DModel } from "./product.types";

const KK006_ID = "p-012";
const KK006_MODEL: Product3DModel = {
  id: "kk-006-v1",
  // Keep the proven Phase 4A URL unchanged. Product detail preload and the
  // configurator both consume this exact canonical value.
  url: "/3d/kk-006.glb",
  filename: "kk-006.glb",
  version: "v1",
  source: "manual",
  file_type: "glb",
  uploaded_at: "2026-07-27T00:00:00.000Z",
  is_required: true,
};

const zones: OfissioProduct["embroidery_zones"] = [
  "left_chest",
  "right_chest",
  "left_sleeve",
  "right_sleeve",
  "upper_back",
  "middle_back",
];

const cameras: OfissioProduct["camera_presets"] = [
  "front",
  "back",
  "left",
  "right",
  "left_chest",
  "right_chest",
];

export const PRODUCT_MOCK_DATA: OfissioProduct[] = PRODUCTS.map((product) => {
  const model = product.id === KK006_ID ? KK006_MODEL : null;
  return {
    ...product,
    source: "mock",
    source_id: `mock-${product.id}`,
    short_description: product.description.slice(0, 140),
    subcategory: product.category,
    lead_time: `${product.leadTimeDays} hari kerja`,
    transaction_mode: "HYBRID",
    available_sizes: product.sizeChart.map((row) => row.size),
    available_colors: product.colors,
    gender: "unisex",
    sleeve_type: product.id === KK006_ID ? "short" : "long",
    usage: "both",
    safety_features: [],
    supports_embroidery: true,
    supports_screen_printing: true,
    supports_dtf: false,
    embroidery_zones: zones,
    has_3d_model: model !== null,
    model_3d: model,
    model_3d_url: model?.url ?? null,
    model_3d_id: model?.id ?? null,
    model_3d_version: model?.version ?? null,
    camera_presets: cameras,
    // Products without their own GLB remain internal drafts and therefore
    // cannot leak into catalog, recommendations, detail, or cart.
    status: model ? "published" : "draft",
  };
});
