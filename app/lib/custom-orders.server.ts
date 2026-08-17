import type { Env } from "./env.server";
import type { LocationTier, ShipmentSize } from "./types";
import { generateCustomOrderNumber } from "./orders.server";

export interface CustomOrderInput {
  itemDescription: string;
  itemLink?: string;
  referenceNotes?: string;
  estimatedBudgetCents?: number;
  quantity: number;
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
}

export async function createCustomOrder(env: Env, input: CustomOrderInput): Promise<{ orderNumber: string; id: number }> {
  const orderNumber = await generateCustomOrderNumber(env);

  const result = await env.DB.prepare(
    `INSERT INTO custom_orders (
      order_number, item_description, item_link, reference_notes, estimated_budget_cents, quantity,
      customer_name, phone, email, whatsapp,
      delivery_method, address, community_area, city_town, delivery_instructions, location_tier, shipment_size,
      payment_method, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`
  )
    .bind(
      orderNumber,
      input.itemDescription,
      input.itemLink || null,
      input.referenceNotes || null,
      input.estimatedBudgetCents ?? null,
      input.quantity,
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
      input.paymentMethod
    )
    .run();

  return { orderNumber, id: result.meta.last_row_id as number };
}

export async function getCustomOrderByNumber(env: Env, orderNumber: string) {
  return env.DB.prepare(`SELECT * FROM custom_orders WHERE order_number = ?`).bind(orderNumber).first<any>();
}

export async function listCustomOrdersAdmin(env: Env, filters: { search?: string; status?: string }) {
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push("(order_number LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR item_description LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await env.DB.prepare(`SELECT * FROM custom_orders ${where} ORDER BY created_at DESC LIMIT 200`)
    .bind(...params)
    .all();
  return results as any[];
}

export async function getCustomOrderAdmin(env: Env, id: number) {
  return env.DB.prepare(`SELECT * FROM custom_orders WHERE id = ?`).bind(id).first<any>();
}

export async function updateCustomOrderStatus(env: Env, id: number, status: string) {
  await env.DB.prepare(`UPDATE custom_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(status, id)
    .run();
}

export async function updateCustomOrderNotes(env: Env, id: number, internalNotes: string) {
  await env.DB.prepare(`UPDATE custom_orders SET internal_notes = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(internalNotes, id)
    .run();
}
