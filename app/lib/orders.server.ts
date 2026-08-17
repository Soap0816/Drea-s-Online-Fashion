import type { Env } from "./env.server";
import type { ResolvedCartLine } from "./cart-resolve.server";
import type { LocationTier, ShipmentSize } from "./types";

export interface CheckoutInput {
  customerName: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  deliveryMethod: "local_delivery" | "pickup";
  address?: string;
  communityArea?: string;
  cityTown?: string;
  deliveryInstructions?: string;
  locationTier?: LocationTier;
  shipmentSize?: ShipmentSize;
  paymentMethod: string;
  customerNotes?: string;
}

/**
 * Generates a human-readable, per-year sequential number for the given
 * counter name (e.g. "order" -> DREA-2026-0001, "custom" -> DREA-CO-2026-0001).
 * Uses SQLite's UPSERT + RETURNING in a single statement so the increment
 * is atomic even if two orders are placed at once.
 */
async function nextSequence(env: Env, counterName: string): Promise<number> {
  const year = new Date().getFullYear();
  const key = `${counterName}-${year}`;

  const row = await env.DB.prepare(
    `INSERT INTO sequence_counters (name, last_number) VALUES (?, 1)
     ON CONFLICT(name) DO UPDATE SET last_number = last_number + 1
     RETURNING last_number`
  )
    .bind(key)
    .first<{ last_number: number }>();

  return row?.last_number ?? 1;
}

export async function generateOrderNumber(env: Env): Promise<string> {
  const year = new Date().getFullYear();
  const sequence = await nextSequence(env, "order");
  return `DREA-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function generateCustomOrderNumber(env: Env): Promise<string> {
  const year = new Date().getFullYear();
  const sequence = await nextSequence(env, "custom");
  return `DREA-CO-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function createOrder(
  env: Env,
  input: CheckoutInput,
  lines: ResolvedCartLine[],
  deliveryFeeCents: number,
  codSurchargeCents: number
): Promise<{ orderNumber: string; orderId: number }> {
  const orderNumber = await generateOrderNumber(env);
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const totalCents = subtotalCents + deliveryFeeCents + codSurchargeCents;

  const orderResult = await env.DB.prepare(
    `INSERT INTO orders (
      order_number, customer_name, phone, email, whatsapp,
      delivery_method, address, community_area, city_town, delivery_instructions,
      location_tier, shipment_size,
      subtotal_cents, delivery_fee_cents, cod_surcharge_cents, total_cents,
      payment_method, status, customer_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`
  )
    .bind(
      orderNumber,
      input.customerName,
      input.phone,
      input.email || null,
      input.whatsapp || null,
      input.deliveryMethod,
      input.address || null,
      input.communityArea || null,
      input.cityTown || null,
      input.deliveryInstructions || null,
      input.locationTier || null,
      input.shipmentSize || null,
      subtotalCents,
      deliveryFeeCents,
      codSurchargeCents,
      totalCents,
      input.paymentMethod,
      input.customerNotes || null
    )
    .run();

  const orderId = orderResult.meta.last_row_id as number;

  const itemStatements = lines.map((line) =>
    env.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name_snapshot, selected_size, selected_colour, quantity, price_snapshot_cents, is_preorder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(orderId, line.productId, line.name, line.size, line.colour, line.quantity, line.unitPriceCents, line.isPreorder ? 1 : 0)
  );

  if (itemStatements.length > 0) {
    await env.DB.batch(itemStatements);
  }

  return { orderNumber, orderId };
}

export interface OrderWithItems {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  delivery_method: string;
  address: string | null;
  community_area: string | null;
  city_town: string | null;
  delivery_instructions: string | null;
  location_tier: string | null;
  shipment_size: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  cod_surcharge_cents: number;
  total_cents: number;
  payment_method: string;
  status: string;
  customer_notes: string | null;
  created_at: string;
  items: {
    id: number;
    product_name_snapshot: string;
    selected_size: string;
    selected_colour: string;
    quantity: number;
    price_snapshot_cents: number;
    is_preorder: number;
  }[];
}

export async function getOrderByNumber(env: Env, orderNumber: string): Promise<OrderWithItems | null> {
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE order_number = ?`)
    .bind(orderNumber)
    .first<any>();
  if (!order) return null;

  const { results: items } = await env.DB.prepare(
    `SELECT id, product_name_snapshot, selected_size, selected_colour, quantity, price_snapshot_cents, is_preorder
     FROM order_items WHERE order_id = ?`
  )
    .bind(order.id)
    .all();

  return { ...order, items: items as any[] } as OrderWithItems;
}
