import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import type {
  WooCommerceListParams,
  WooCommerceProduct,
  WooCommerceProductVariation,
} from "@/features/products/woocommerce/woocommerce.types";

export type StockMonitoringStatus =
  | "safe"
  | "low"
  | "production_needed"
  | "not_synced";

export interface WooStockItem {
  parentSku: string;
  stockSku: string;
  sizeLabel: string | null;
  wooCommerceProductId: number;
  wooCommerceVariationId: number | null;
  manageStock: boolean;
  stockQuantity: number | null;
  stockStatus: string;
  minimumThreshold: number;
  shortageToMinimum: number | null;
  status: StockMonitoringStatus;
  variationSkuConfigured: boolean;
  lastCheckedAt: string;
}

export interface WooSizeStockMatrix {
  enabled: boolean;
  source: "woocommerce";
  parentSku: string;
  productId: number | null;
  productName: string | null;
  rows: WooStockItem[];
  hasVariationSkuWarning: boolean;
  lastCheckedAt: string;
}

export interface OrderStockRequirement {
  orderId: string;
  companyId: string;
  productId: string;
  productName: string;
  parentSku: string;
  stockSku: string;
  sizeLabel: string | null;
  requiredQty: number;
}

export interface OrderStockComparison extends OrderStockRequirement {
  availableQty: number | null;
  shortageQty: number | null;
  minimumThreshold: number;
  manageStock: boolean;
  stockStatus: string;
  monitoringStatus: StockMonitoringStatus;
  lastCheckedAt: string;
}

export interface OrderStockComparisonResult {
  enabled: boolean;
  source: "woocommerce";
  orderId: string;
  requirements: OrderStockComparison[];
  hasShortage: boolean;
  hasLowStock: boolean;
  hasUnsyncedSku: boolean;
  lastCheckedAt: string;
}

export interface WooStockDataSource {
  getProducts(params?: WooCommerceListParams): Promise<WooCommerceProduct[]>;
  getProductVariations(
    productId: string | number,
    params?: { page?: number; per_page?: number },
  ): Promise<WooCommerceProductVariation[]>;
}

export type OrderWithStockItems = Pick<
  PaymentOrderRecord,
  "id" | "companyId" | "items"
>;

export type ReplenishmentReason =
  | "low_stock"
  | "order_shortage"
  | "replenishment";

export type ReplenishmentRequestStatus =
  | "requested"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ProductionReplenishmentRequest {
  id: string;
  idempotencyKey: string;
  companyId: string | null;
  orderId: string | null;
  parentSku: string;
  stockSku: string;
  sizeLabel: string | null;
  requiredQty: number;
  availableStock: number;
  shortageQty: number;
  reason: ReplenishmentReason;
  status: ReplenishmentRequestStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReplenishmentRequestInput {
  companyId?: string | null;
  orderId?: string | null;
  parentSku: string;
  stockSku: string;
  sizeLabel?: string | null;
  requiredQty: number;
  availableStock: number;
  shortageQty: number;
  reason: ReplenishmentReason;
  createdBy: string;
}

export interface ReplenishmentRepository {
  findByIdempotencyKey(key: string): Promise<ProductionReplenishmentRequest | null>;
  create(request: ProductionReplenishmentRequest): Promise<ProductionReplenishmentRequest>;
  listByOrder(orderId: string): Promise<ProductionReplenishmentRequest[]>;
}
