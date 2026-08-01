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

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  status: "draft" | "pending" | "private" | "publish" | string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status?: "instock" | "outofstock" | "onbackorder" | string;
  images?: WooCommerceImage[];
  categories?: WooCommerceCategory[];
  tags?: WooCommerceTag[];
  attributes?: WooCommerceAttribute[];
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceProductWritePayload {
  name?: string;
  slug?: string;
  sku?: string;
  status?: "draft" | "publish";
  description?: string;
  short_description?: string;
  regular_price?: string;
  categories?: Array<{ id: number }>;
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
}

export interface WooCommerceOrderMeta {
  key: string;
  value: string;
}

export interface WooCommerceOrderLineItem {
  product_id?: number;
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
  meta_data?: WooCommerceOrderMeta[];
}

export interface WooCommerceOrder {
  id: number;
  status: string;
  number?: string;
  meta_data?: WooCommerceMetaData[];
}
