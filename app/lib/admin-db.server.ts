import type { Env } from "./env.server";
import type { Product, ProductImage } from "./types";

/**
 * All writes for the admin dashboard live here, separate from the public
 * catalog read functions in db.server.ts. Nothing in this file filters
 * out hidden products or applies customer-facing rules — the owner needs
 * to see and manage everything.
 */

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface ProductInput {
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  category: string;
  sizes: string[];
  colours: string[];
  featured: boolean;
  newArrival: boolean;
  availability: "available" | "temporarily_unavailable" | "discontinued";
  hidden: boolean;
}

function rowToProduct(row: any, images: ProductImage[], variants: any[]): Product {
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

export async function listAllProductsAdmin(env: Env, search?: string): Promise<Product[]> {
  const where = search ? `WHERE name LIKE ?` : "";
  const { results } = await env.DB.prepare(
    `SELECT * FROM products ${where} ORDER BY created_at DESC`
  )
    .bind(...(search ? [`%${search}%`] : []))
    .all();

  const rows = results as any[];
  const ids = rows.map((r) => r.id);
  const [imagesMap, variantsMap] = await Promise.all([loadImagesForProducts(env, ids), loadVariantsForProducts(env, ids)]);
  return rows.map((row) => rowToProduct(row, imagesMap.get(row.id) ?? [], variantsMap.get(row.id) ?? []));
}

export async function getProductForAdmin(env: Env, id: number): Promise<Product | null> {
  const row = await env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first();
  if (!row) return null;
  const [imagesMap, variantsMap] = await Promise.all([
    loadImagesForProducts(env, [(row as any).id]),
    loadVariantsForProducts(env, [(row as any).id]),
  ]);
  return rowToProduct(row, imagesMap.get((row as any).id) ?? [], variantsMap.get((row as any).id) ?? []);
}

async function loadVariantsForProducts(env: Env, productIds: number[]): Promise<Map<number, any[]>> {
  const map = new Map<number, any[]>();
  if (productIds.length === 0) return map;
  const placeholders = productIds.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT id, product_id, size, colour, stock_status FROM product_variants
     WHERE product_id IN (${placeholders}) ORDER BY product_id, sort_order ASC`
  )
    .bind(...productIds)
    .all();
  for (const row of results as any[]) {
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}

async function loadImagesForProducts(env: Env, productIds: number[]): Promise<Map<number, ProductImage[]>> {
  const map = new Map<number, ProductImage[]>();
  if (productIds.length === 0) return map;
  const placeholders = productIds.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT id, product_id, image_key, alt_text, sort_order FROM product_images
     WHERE product_id IN (${placeholders}) ORDER BY product_id, sort_order ASC`
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

export async function createProduct(env: Env, input: ProductInput): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO products (name, slug, description, price_cents, category, sizes, colours, featured, new_arrival, availability, hidden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      input.name,
      input.slug,
      input.description,
      input.priceCents,
      input.category,
      JSON.stringify(input.sizes),
      JSON.stringify(input.colours),
      input.featured ? 1 : 0,
      input.newArrival ? 1 : 0,
      input.availability,
      input.hidden ? 1 : 0
    )
    .run();
  return result.meta.last_row_id as number;
}

export async function updateProduct(env: Env, id: number, input: ProductInput): Promise<void> {
  await env.DB.prepare(
    `UPDATE products SET
      name = ?, slug = ?, description = ?, price_cents = ?, category = ?,
      sizes = ?, colours = ?, featured = ?, new_arrival = ?, availability = ?, hidden = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      input.name,
      input.slug,
      input.description,
      input.priceCents,
      input.category,
      JSON.stringify(input.sizes),
      JSON.stringify(input.colours),
      input.featured ? 1 : 0,
      input.newArrival ? 1 : 0,
      input.availability,
      input.hidden ? 1 : 0,
      id
    )
    .run();
}

export async function deleteProduct(env: Env, id: number): Promise<void> {
  // product_images cascade-delete via the FK; order_items keep their
  // snapshot and just lose the product_id reference (ON DELETE SET NULL).
  await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
}

export async function setProductHidden(env: Env, id: number, hidden: boolean): Promise<void> {
  await env.DB.prepare(`UPDATE products SET hidden = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(hidden ? 1 : 0, id)
    .run();
}

export async function isSlugTaken(env: Env, slug: string, excludeId?: number): Promise<boolean> {
  const row = excludeId
    ? await env.DB.prepare(`SELECT id FROM products WHERE slug = ? AND id != ?`).bind(slug, excludeId).first()
    : await env.DB.prepare(`SELECT id FROM products WHERE slug = ?`).bind(slug).first();
  return !!row;
}

// ---------------------------------------------------------------------------
// Product variants (size + colour stock status)
// ---------------------------------------------------------------------------

/**
 * Replaces all variant rows for a product with the given set. Called
 * whenever the owner saves the Stock & Pre-Order grid on the edit page —
 * simpler and less error-prone than diffing individual rows.
 */
export async function setProductVariants(
  env: Env,
  productId: number,
  variants: { size: string; colour: string; stockStatus: "in_stock" | "preorder" | "out_of_stock" }[]
) {
  await env.DB.prepare(`DELETE FROM product_variants WHERE product_id = ?`).bind(productId).run();
  const statements = variants.map((v, i) =>
    env.DB.prepare(
      `INSERT INTO product_variants (product_id, size, colour, stock_status, sort_order) VALUES (?, ?, ?, ?, ?)`
    ).bind(productId, v.size, v.colour, v.stockStatus, i)
  );
  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
}

// ---------------------------------------------------------------------------
// Product images
// ---------------------------------------------------------------------------

export async function addProductImage(env: Env, productId: number, imageKey: string, altText: string, sortOrder: number) {
  await env.DB.prepare(
    `INSERT INTO product_images (product_id, image_key, alt_text, sort_order) VALUES (?, ?, ?, ?)`
  )
    .bind(productId, imageKey, altText, sortOrder)
    .run();
}

export async function deleteProductImage(env: Env, imageId: number): Promise<string | null> {
  const row = await env.DB.prepare(`SELECT image_key FROM product_images WHERE id = ?`).bind(imageId).first<{ image_key: string }>();
  await env.DB.prepare(`DELETE FROM product_images WHERE id = ?`).bind(imageId).run();
  return row?.image_key ?? null;
}

export async function moveProductImage(env: Env, productId: number, imageId: number, direction: "up" | "down") {
  const { results } = await env.DB.prepare(
    `SELECT id, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC`
  )
    .bind(productId)
    .all();
  const images = results as { id: number; sort_order: number }[];
  const index = images.findIndex((i) => i.id === imageId);
  if (index === -1) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= images.length) return;

  const a = images[index];
  const b = images[swapWith];
  await env.DB.batch([
    env.DB.prepare(`UPDATE product_images SET sort_order = ? WHERE id = ?`).bind(b.sort_order, a.id),
    env.DB.prepare(`UPDATE product_images SET sort_order = ? WHERE id = ?`).bind(a.sort_order, b.id),
  ]);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface OrderListFilters {
  search?: string;
  status?: string;
}

export async function listOrdersAdmin(env: Env, filters: OrderListFilters) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push("(order_number LIKE ? OR customer_name LIKE ? OR phone LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await env.DB.prepare(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT 200`
  )
    .bind(...params)
    .all();
  return results as any[];
}

export async function getOrderAdmin(env: Env, id: number) {
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).first<any>();
  if (!order) return null;
  const { results: items } = await env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id = ?`
  )
    .bind(id)
    .all();
  return { ...order, items: items as any[] };
}

export async function updateOrderStatus(env: Env, id: number, status: string) {
  await env.DB.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(status, id)
    .run();
}

export async function updateOrderNotes(env: Env, id: number, internalNotes: string) {
  await env.DB.prepare(`UPDATE orders SET internal_notes = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(internalNotes, id)
    .run();
}

// ---------------------------------------------------------------------------
// Overview stats
// ---------------------------------------------------------------------------

export async function getOverviewStats(env: Env) {
  const [totalOrders, newOrders, pendingOrders, completedOrders, totalSales, recentOrders, recentProducts] =
    await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as c FROM orders`).first<{ c: number }>(),
      env.DB.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'new'`).first<{ c: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) as c FROM orders WHERE status NOT IN ('completed', 'cancelled')`
      ).first<{ c: number }>(),
      env.DB.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'completed'`).first<{ c: number }>(),
      env.DB.prepare(
        `SELECT COALESCE(SUM(total_cents), 0) as s FROM orders WHERE status != 'cancelled'`
      ).first<{ s: number }>(),
      env.DB.prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 5`).all(),
      env.DB.prepare(`SELECT * FROM products ORDER BY created_at DESC LIMIT 5`).all(),
    ]);

  return {
    totalOrders: totalOrders?.c ?? 0,
    newOrders: newOrders?.c ?? 0,
    pendingOrders: pendingOrders?.c ?? 0,
    completedOrders: completedOrders?.c ?? 0,
    totalSalesCents: totalSales?.s ?? 0,
    recentOrders: recentOrders.results as any[],
    recentProducts: recentProducts.results as any[],
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettingsRaw(env: Env): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare(`SELECT key, value FROM settings`).all();
  const raw: Record<string, string> = {};
  for (const row of results as any[]) raw[row.key] = row.value;
  return raw;
}

export async function upsertSettings(env: Env, values: Record<string, string>) {
  const statements = Object.entries(values).map(([key, value]) =>
    env.DB.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).bind(key, value)
  );
  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
}
