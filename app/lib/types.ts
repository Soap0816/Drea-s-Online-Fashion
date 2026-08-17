export type Availability = "available" | "temporarily_unavailable" | "discontinued";
export type StockStatus = "in_stock" | "preorder" | "out_of_stock";
export type LocationTier = "urban" | "rural" | "extended" | "remote" | "tobago";
export type ShipmentSize = "small" | "medium";
export type CourierAccountType = "standard" | "corporate";

export const LOCATION_TIER_LABELS: Record<LocationTier, string> = {
  urban: "Urban",
  rural: "Rural",
  extended: "Extended",
  remote: "Remote",
  tobago: "Tobago",
};

export const SHIPMENT_SIZE_LABELS: Record<ShipmentSize, string> = {
  small: "Small Parcel",
  medium: "Medium Parcel",
};

export interface ProductImage {
  id: number;
  product_id: number;
  image_key: string;
  alt_text: string | null;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size: string;
  colour: string; // '' when the product has no colour options
  stock_status: StockStatus;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  category: string;
  sizes: string[];
  colours: string[];
  featured: boolean;
  new_arrival: boolean;
  availability: Availability; // fallback stock signal for size/colour combos with no variant row
  hidden: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
}

/** Resolves the effective stock status for a specific size/colour pick. */
export function resolveStockStatus(product: Product, size: string, colour: string): StockStatus {
  const variant = product.variants.find(
    (v) => v.size === size && v.colour === (colour || "")
  );
  if (variant) return variant.stock_status;
  if (product.availability === "available") return "in_stock";
  if (product.availability === "discontinued") return "out_of_stock";
  return "preorder"; // "temporarily_unavailable" at the product level reads as pre-orderable by default
}

export interface Settings {
  business_name: string;
  instagram_handle: string;
  whatsapp_number: string;
  contact_email: string;
  business_description: string;
  checkout_notice: string;
  delivery_fee_default: number; // cents — legacy flat fallback, superseded by delivery_rates
  delivery_fee_pickup: number; // cents
  payment_methods_enabled: string[];
  currency_code: string;
  currency_symbol: string;
  courier_account_type: CourierAccountType;
  cod_surcharge_percent: number;
  delivery_rates: Record<CourierAccountType, Record<LocationTier, Record<ShipmentSize, number>>>;
}

export type OrderStatus =
  | "new"
  | "reviewing"
  | "availability_confirmed"
  | "awaiting_payment"
  | "processing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  availability_confirmed: "Availability Confirmed",
  awaiting_payment: "Awaiting Payment",
  processing: "Processing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CATEGORY_LABELS: Record<string, string> = {
  dresses: "Dresses",
  jumpsuits: "Jumpsuits",
  sets: "Matching Sets",
  tops: "Tops",
  bottoms: "Bottoms",
};

export type CustomOrderStatus =
  | "new"
  | "reviewing"
  | "quoted"
  | "awaiting_payment"
  | "ordered"
  | "shipped"
  | "ready"
  | "completed"
  | "cancelled";

export const CUSTOM_ORDER_STATUS_LABELS: Record<CustomOrderStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  quoted: "Quoted",
  awaiting_payment: "Awaiting Payment",
  ordered: "Ordered from Supplier",
  shipped: "Shipped",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};
