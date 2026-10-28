export interface WooCommerceMetaData {
  id?: number;
  key: string;
  value: unknown;
}

export interface WooCommerceImage {
  id: number;
  src: string;
  name?: string;
  alt?: string;
}

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

export interface WooCommerceAttribute {
  id: number;
  name: string;
  slug: string;
  type?: string;
  order_by?: string;
  has_archives?: boolean;
  options?: string[];
  visible?: boolean;
  variation?: boolean;
}

export interface WooCommerceAttributeTerm {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

export interface WooCommerceTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceCoupon {
  id: number;
  code: string;
  amount: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product" | string;
  description?: string;
  date_expires?: string | null;
  individual_use?: boolean;
  usage_count?: number;
  usage_limit?: number | null;
  usage_limit_per_user?: number | null;
  minimum_amount?: string;
  maximum_amount?: string;
  product_ids?: number[];
  excluded_product_ids?: number[];
  product_categories?: number[];
  excluded_product_categories?: number[];
  exclude_sale_items?: boolean;
  email_restrictions?: string[];
}

export type WooCommerceCouponWritePayload = Partial<Omit<WooCommerceCoupon, "id" | "usage_count">> & {
  code: string;
  amount: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product";
};

export type WooCommerceCouponUpdatePayload = Partial<Omit<WooCommerceCoupon, "id" | "usage_count">>;

export interface WooCommerceProduct {
  /** Transient evidence from native variations; never persisted as product metadata. */
  liveOfferPrice?: number;
  purchasable?: boolean;
  id: number;
  date_created?: string;
  date_created_gmt?: string;
  date_modified?: string;
  date_modified_gmt?: string;
  name: string;
  slug: string;
  sku: string;
  status: "draft" | "pending" | "private" | "publish" | string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  weight?: string;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
  };
  type?: "simple" | "variable" | "variation" | string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: "instock" | "outofstock" | "onbackorder" | string;
  low_stock_amount?: number | null;
  variations?: number[];
  images?: WooCommerceImage[];
  categories?: WooCommerceCategory[];
  tags?: WooCommerceTag[];
  attributes?: WooCommerceAttribute[];
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceVariationAttribute {
  id?: number;
  name?: string;
  option: string;
}

export interface WooCommerceProductVariation {
  id: number;
  sku: string;
  displaySku?: string;
  rawSku?: string;
  inheritedFromParent?: boolean;
  status?: "publish" | "private" | string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  image?: WooCommerceImage | null;
  meta_data?: WooCommerceMetaData[];
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: "instock" | "outofstock" | "onbackorder" | string;
  low_stock_amount?: number | null;
  attributes?: WooCommerceVariationAttribute[];
}

export interface WooCommerceProductVariationWritePayload {
  sku?: string;
  status?: "publish" | "private";
  regular_price?: string;
  sale_price?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: "instock" | "outofstock" | "onbackorder";
  image?: { id?: number; src?: string; name?: string; alt?: string };
  attributes: WooCommerceVariationAttribute[];
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceProductWritePayload {
  type?: "simple" | "variable";
  default_attributes?: Array<{ id?: number; name?: string; option: string }>;
  name?: string;
  slug?: string;
  sku?: string;
  status?: "draft" | "publish";
  description?: string;
  short_description?: string;
  regular_price?: string;
  sale_price?: string;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  categories?: Array<{ id: number }>;
  tags?: Array<{ id?: number; name?: string }>;
  images?: Array<{
    id?: number;
    src?: string;
    name?: string;
    alt?: string;
  }>;
  attributes?: Array<{
    id?: number;
    name?: string;
    visible?: boolean;
    variation?: boolean;
    options: string[];
  }>;
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceListParams {
  page?: number;
  per_page?: number;
  status?: "publish" | "draft" | "any";
  slug?: string;
  search?: string;
  category?: string;
  sku?: string;
}

export interface WooCommerceOrderMeta {
  key: string;
  value: string;
}

export interface WooCommerceOrderLineItem {
  product_id?: number;
  variation_id?: number;
  name?: string;
  sku?: string;
  quantity: number;
  subtotal?: string;
  total?: string;
  meta_data?: WooCommerceOrderMeta[];
}

export interface WooCommerceShippingLine {
  method_title: string;
  method_id: string;
  total: string;
}

export interface WooCommerceBilling {
  first_name?: string;
  company?: string;
  phone?: string;
  email?: string;
}

export interface WooCommerceCreateOrderInput {
  status?: string;
  currency?: "IDR";
  set_paid?: boolean;
  customer_note?: string;
  billing?: WooCommerceBilling;
  line_items: WooCommerceOrderLineItem[];
  shipping_lines?: WooCommerceShippingLine[];
  coupon_lines?: Array<{ code: string }>;
  meta_data?: WooCommerceOrderMeta[];
}

export interface WooCommerceOrder {
  id: number;
  status: string;
  number?: string;
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceUpdateOrderInput {
  meta_data?: WooCommerceMetaData[];
}
