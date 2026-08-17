import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { requireAdmin } from "~/lib/auth.server";
import { getOrderAdmin, updateOrderStatus, updateOrderNotes } from "~/lib/admin-db.server";
import { getSettings } from "~/lib/db.server";
import { formatMoney } from "~/lib/money";
import { ORDER_STATUS_LABELS, LOCATION_TIER_LABELS, SHIPMENT_SIZE_LABELS, type OrderStatus, type LocationTier, type ShipmentSize } from "~/lib/types";

export const meta: MetaFunction = () => [{ title: "Order Detail — Drea Admin" }];

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  local_delivery: "Local Delivery",
  pickup: "Pickup",
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const order = await getOrderAdmin(env, Number(params.id));
  if (!order) throw new Response("Order not found", { status: 404 });
  const settings = await getSettings(env);
  return json({ order, settings });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const orderId = Number(params.id);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "update-status") {
    await updateOrderStatus(env, orderId, String(form.get("status")));
  }
  if (intent === "update-notes") {
    await updateOrderNotes(env, orderId, String(form.get("internalNotes") || ""));
  }

  return json({ saved: intent });
}

export default function AdminOrderDetail() {
  const { order, settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/orders" className="text-sm text-taupe hover:text-forest">&larr; Orders</Link>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl">{order.order_number}</h1>
          <p className="text-taupe text-sm mt-1">Placed {new Date(order.created_at).toLocaleString()}</p>
        </div>

        <Form method="post" className="flex items-center gap-2">
          <input type="hidden" name="intent" value="update-status" />
          <select
            name="status"
            defaultValue={order.status}
            className="border border-line px-3 py-2 text-sm bg-surface"
          >
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
            Update Status
          </button>
        </Form>
      </div>

      {actionData?.saved === "update-status" && (
        <p className="mb-6 text-sm bg-forest/10 text-forest-dark px-4 py-2.5 max-w-2xl">Status updated.</p>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <p className="eyebrow mb-3">Items</p>
            <div className="border border-line divide-y divide-line">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between px-4 py-3 text-sm">
                  <span>
                    {item.product_name_snapshot} ({item.selected_size}{item.selected_colour ? `/${item.selected_colour}` : ""}) &times;{item.quantity}
                    {!!item.is_preorder && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide bg-brass/15 text-brass-dark px-2 py-0.5">Pre-Order</span>
                    )}
                  </span>
                  <span>{formatMoney(item.price_snapshot_cents * item.quantity, settings.currency_symbol)}</span>
                </div>
              ))}
            </div>
            <div className="border border-line border-t-0 px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-taupe">Subtotal</span>
                <span>{formatMoney(order.subtotal_cents, settings.currency_symbol)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-taupe">Delivery Fee</span>
                <span>{formatMoney(order.delivery_fee_cents, settings.currency_symbol)}</span>
              </div>
              {order.cod_surcharge_cents > 0 && (
                <div className="flex justify-between">
                  <span className="text-taupe">COD Service Charge</span>
                  <span>{formatMoney(order.cod_surcharge_cents, settings.currency_symbol)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-1">
                <span>Total</span>
                <span>{formatMoney(order.total_cents, settings.currency_symbol)}</span>
              </div>
            </div>
          </section>

          {order.customer_notes && (
            <section>
              <p className="eyebrow mb-3">Customer Notes</p>
              <p className="text-sm bg-line/40 p-4">{order.customer_notes}</p>
            </section>
          )}

          <section>
            <p className="eyebrow mb-3">Internal Notes</p>
            <Form method="post">
              <input type="hidden" name="intent" value="update-notes" />
              <textarea
                name="internalNotes"
                rows={4}
                defaultValue={order.internal_notes ?? ""}
                placeholder="Private notes for your team — not visible to the customer."
                className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest mb-3"
              />
              <button type="submit" disabled={isSubmitting} className="btn-secondary disabled:opacity-60">
                Save Notes
              </button>
              {actionData?.saved === "update-notes" && (
                <span className="ml-3 text-sm text-forest-dark">Saved.</span>
              )}
            </Form>
          </section>
        </div>

        <div className="space-y-8">
          <section className="border border-line p-5">
            <p className="eyebrow mb-3">Customer</p>
            <p className="text-sm">{order.customer_name}</p>
            <p className="text-sm text-taupe">{order.phone}</p>
            {order.email && <p className="text-sm text-taupe">{order.email}</p>}
            {order.whatsapp && (
              <a
                href={`https://wa.me/${order.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-forest hover:underline block mt-2"
              >
                Message on WhatsApp
              </a>
            )}
          </section>

          <section className="border border-line p-5">
            <p className="eyebrow mb-3">Delivery</p>
            <p className="text-sm">{DELIVERY_METHOD_LABELS[order.delivery_method] ?? order.delivery_method}</p>
            {order.delivery_method === "local_delivery" && (
              <p className="text-sm text-taupe mt-1">
                {order.address}<br />
                {order.community_area}, {order.city_town}
              </p>
            )}
            {order.location_tier && order.shipment_size && (
              <p className="text-xs text-taupe mt-1">
                {LOCATION_TIER_LABELS[order.location_tier as LocationTier] ?? order.location_tier} &middot;{" "}
                {SHIPMENT_SIZE_LABELS[order.shipment_size as ShipmentSize] ?? order.shipment_size}
              </p>
            )}
            {order.delivery_instructions && (
              <p className="text-sm text-taupe mt-2 italic">"{order.delivery_instructions}"</p>
            )}
          </section>

          <section className="border border-line p-5">
            <p className="eyebrow mb-3">Payment</p>
            <p className="text-sm capitalize">{order.payment_method.replace("_", " ")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
