import type { Env } from "./env.server";
import type { Product, ProductImage, ProductVariant, Settings, CourierAccountType } from "./types";

/**
 * Data-access layer for the public catalog.
 * Cart/checkout reads live alongside this; all writes for the admin
 * dashboard live in admin-db.server.ts. Keeping catalog SQL in one file
 * makes the schema easy to audit and keeps route files free of inline
 * queries.
 */

function rowToProduct(row: any, images: ProductImage[], variants: ProductVariant[]): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price_cents: row.price_cents,
    category: row.category,
    sizes: JSON.parse(row.sizes || "[]"),
    colours: JSON.parse(row.colours || "[]"),
    featured: !!row.featured,
    new_arrival: !!row.new_arrival,
    availability: row.availability,
    hidden: !!row.hidden,
    images,
    variants,
  };
}

async function loadImagesForProducts(db: D1Database, productIds: number[]): Promise<Map<number, ProductImage[]>> {
  const map = new Map<number, ProductImage[]>();
  if (productIds.length === 0) return map;

  const placeholders = productIds.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT id, product_id, image_key, alt_text, sort_order
       FROM product_images
       WHERE product_id IN (${placeholders})
       ORDER BY product_id, sort_order ASC`
    )
    .bind(...productIds)
    .all();

  for (const row of results as any[]) {
    const list = map.get(row.product_id) ?? [];
    list.push(row as ProductImage);
    map.set(row.product_id, list);
  }
  return map;
}

async function loadVariantsForProducts(db: D1Database, productIds: number[]): Promise<Map<number, ProductVariant[]>> {
  const map = new Map<number, ProductVariant[]>();
  if (productIds.length === 0) return map;

  const placeholders = productIds.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT id, product_id, size, colour, stock_status
       FROM product_variants
       WHERE product_id IN (${placeholders})
       ORDER BY product_id, sort_order ASC`
    )
    .bind(...productIds)
    .all();

  for (const row of results as any[]) {
    const list = map.get(row.product_id) ?? [];
    list.push(row as ProductVariant);
    map.set(row.product_id, list);
  }
  return map;
}

async function hydrateProducts(env: Env, rows: any[]): Promise<Product[]> {
  const ids = rows.map((r) => r.id);
  const [imagesMap, variantsMap] = await Promise.all([
    loadImagesForProducts(env.DB, ids),
    loadVariantsForProducts(env.DB, ids),
  ]);
  return rows.map((row) => rowToProduct(row, imagesMap.get(row.id) ?? [], variantsMap.get(row.id) ?? []));
}

export interface ShopFilters {
  category?: string;
  size?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "featured";
}

export async function listShopProducts(env: Env, filters: ShopFilters): Promise<Product[]> {
  const conditions: string[] = ["hidden = 0"];
  const params: any[] = [];

  if (filters.category) {
    conditions.push("category = ?");
    params.push(filters.category);
  }
  if (filters.size) {
    conditions.push("sizes LIKE ?");
    params.push(`%"${filters.size}"%`);
  }
  if (typeof filters.minPriceCents === "number") {
    conditions.push("price_cents >= ?");
    params.push(filters.minPriceCents);
  }
  if (typeof filters.maxPriceCents === "number") {
    conditions.push("price_cents <= ?");
    params.push(filters.maxPriceCents);
  }
  if (filters.search) {
    conditions.push("(name LIKE ? OR description LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  let orderBy = "sort_order ASC, created_at DESC";
  switch (filters.sort) {
    case "price_asc":
      orderBy = "price_cents ASC";
      break;
    case "price_desc":
      orderBy = "price_cents DESC";
      break;
    case "newest":
      orderBy = "created_at DESC";
      break;
    case "featured":
      orderBy = "featured DESC, sort_order ASC";
      break;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await env.DB.prepare(
    `SELECT * FROM products ${where} ORDER BY ${orderBy}`
  )
    .bind(...params)
    .all();

  return hydrateProducts(env, results as any[]);
}

export async function getFeaturedProducts(env: Env, limit = 8): Promise<Product[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM products WHERE hidden = 0 AND featured = 1 ORDER BY sort_order ASC LIMIT ?`
  )
    .bind(limit)
    .all();
  return hydrateProducts(env, results as any[]);
}

export async function getNewArrivals(env: Env, limit = 8): Promise<Product[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM products WHERE hidden = 0 AND new_arrival = 1 ORDER BY created_at DESC LIMIT ?`
  )
    .bind(limit)
    .all();
  return hydrateProducts(env, results as any[]);
}

export async function getProductBySlug(env: Env, slug: string): Promise<Product | null> {
  const row = await env.DB.prepare(`SELECT * FROM products WHERE slug = ? AND hidden = 0`)
    .bind(slug)
    .first();
  if (!row) return null;
  const products = await hydrateProducts(env, [row]);
  return products[0];
}

/**
 * Loads products by id regardless of hidden status, for resolving cart
 * contents and checkout — a product can be hidden after a customer already
 * added it to their cart, and we still need its current name/price/
 * availability to show them accurately (rather than silently vanishing).
 */
export async function getProductsByIds(env: Env, ids: number[]): Promise<Map<number, Product>> {
  const map = new Map<number, Product>();
  if (ids.length === 0) return map;

  const placeholders = ids.map(() => "?").join(",");
  const { results } = await env.DB.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all();

  const products = await hydrateProducts(env, results as any[]);
  for (const p of products) map.set(p.id, p);
  return map;
}

export async function listCategories(env: Env): Promise<{ category: string; count: number }[]> {
  const { results } = await env.DB.prepare(
    `SELECT category, COUNT(*) as count FROM products WHERE hidden = 0 GROUP BY category ORDER BY category`
  ).all();
  return results as any[];
}

const DEFAULT_DELIVERY_RATES: Settings["delivery_rates"] = {
  standard: {
    urban: { small: 3000, medium: 4500 },
    rural: { small: 4000, medium: 5500 },
    extended: { small: 5000, medium: 6500 },
    remote: { small: 6000, medium: 7500 },
    tobago: { small: 6000, medium: 7500 },
  },
  corporate: {
    urban: { small: 3500, medium: 5000 },
    rural: { small: 4500, medium: 6000 },
    extended: { small: 5500, medium: 7000 },
    remote: { small: 6500, medium: 8000 },
    tobago: { small: 6500, medium: 8000 },
  },
};

const SETTINGS_DEFAULTS: Settings = {
  business_name: "Drea Online Fashion",
  instagram_handle: "drea_online_fashion",
  whatsapp_number: "",
  contact_email: "",
  business_description: "Style made for you. Discover your next favorite look.",
  checkout_notice:
    "Please note: some items are sourced after an order is placed. Availability will be confirmed after your order is received.",
  delivery_fee_default: 0,
  delivery_fee_pickup: 0,
  payment_methods_enabled: ["cash", "card"],
  currency_code: "TTD",
  currency_symbol: "TT$",
  courier_account_type: "standard",
  cod_surcharge_percent: 3,
  delivery_rates: DEFAULT_DELIVERY_RATES,
};

export async function getSettings(env: Env): Promise<Settings> {
  const { results } = await env.DB.prepare(`SELECT key, value FROM settings`).all();
  const raw: Record<string, string> = {};
  for (const row of results as any[]) raw[row.key] = row.value;

  let deliveryRates = SETTINGS_DEFAULTS.delivery_rates;
  if (raw.delivery_rates_json) {
    try {
      deliveryRates = JSON.parse(raw.delivery_rates_json);
    } catch {
      deliveryRates = SETTINGS_DEFAULTS.delivery_rates;
    }
  }

  return {
    business_name: raw.business_name ?? SETTINGS_DEFAULTS.business_name,
    instagram_handle: raw.instagram_handle ?? SETTINGS_DEFAULTS.instagram_handle,
    whatsapp_number: raw.whatsapp_number ?? SETTINGS_DEFAULTS.whatsapp_number,
    contact_email: raw.contact_email ?? SETTINGS_DEFAULTS.contact_email,
    business_description: raw.business_description ?? SETTINGS_DEFAULTS.business_description,
    checkout_notice: raw.checkout_notice ?? SETTINGS_DEFAULTS.checkout_notice,
    delivery_fee_default: Number(raw.delivery_fee_default ?? 0),
    delivery_fee_pickup: Number(raw.delivery_fee_pickup ?? 0),
    payment_methods_enabled: (raw.payment_methods_enabled ?? "cash,card")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    currency_code: raw.currency_code ?? SETTINGS_DEFAULTS.currency_code,
    currency_symbol: raw.currency_symbol ?? SETTINGS_DEFAULTS.currency_symbol,
    courier_account_type: (raw.courier_account_type as CourierAccountType) ?? "standard",
    cod_surcharge_percent: Number(raw.cod_surcharge_percent ?? 3),
    delivery_rates: deliveryRates,
  };
}

/** Resolves an R2 image key to a public URL served by the images route. */
export function imageUrl(imageKey: string | undefined | null): string {
  if (!imageKey) return "/images/placeholder-product.svg";
  return `/images/${imageKey}`;
}
