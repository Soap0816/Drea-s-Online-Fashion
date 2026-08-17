import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { requireAdmin } from "~/lib/auth.server";
import { getCustomOrderAdmin, updateCustomOrderStatus, updateCustomOrderNotes } from "~/lib/custom-orders.server";
import { getSettings } from "~/lib/db.server";
import { formatMoney } from "~/lib/money";
import { CUSTOM_ORDER_STATUS_LABELS, LOCATION_TIER_LABELS, SHIPMENT_SIZE_LABELS, type LocationTier, type ShipmentSize } from "~/lib/types";

export const meta: MetaFunction = () => [{ title: "Request Detail — Drea Admin" }];

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const order = await getCustomOrderAdmin(env, Number(params.id));
  if (!order) throw new Response("Request not found", { status: 404 });
  const settings = await getSettings(env);
  return json({ order, settings });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const id = Number(params.id);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "update-status") {
    await updateCustomOrderStatus(env, id, String(form.get("status")));
  }
  if (intent === "update-notes") {
    await updateCustomOrderNotes(env, id, String(form.get("internalNotes") || ""));
  }

  return json({ saved: intent });
}

export default function AdminCustomOrderDetail() {
  const { order, settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/custom-orders" className="text-sm text-taupe hover:text-forest">&larr; Order What You Want</Link>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl">{order.order_number}</h1>
          <p className="text-taupe text-sm mt-1">Submitted {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <Form method="post" className="flex items-center gap-2">
          <input type="hidden" name="intent" value="update-status" />
          <select name="status" defaultValue={order.status} className="border border-line px-3 py-2 text-sm bg-surface">
            {Object.entries(CUSTOM_ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">Update Status</button>
        </Form>
      </div>

      {actionData?.saved === "update-status" && (
        <p className="mb-6 text-sm bg-forest/10 text-forest-dark px-4 py-2.5 max-w-2xl">Status updated.</p>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="border border-line p-5">
            <p className="eyebrow mb-3">Item Requested</p>
            <p className="text-sm mb-2">{order.item_description}</p>
            {order.item_link && (
              <a href={order.item_link} target="_blank" rel="noreferrer" className="text-sm text-forest hover:underline break-all block mb-2">
                {order.item_link}
              </a>
            )}
            <p className="text-sm text-taupe">Quantity: {order.quantity}</p>
            {order.estimated_budget_cents && (
              <p className="text-sm text-taupe">
                Customer's estimate: {formatMoney(order.estimated_budget_cents, settings.currency_symbol)}
              </p>
            )}
            {order.reference_notes && <p className="text-sm text-charcoal/70 mt-2 italic">"{order.reference_notes}"</p>}
          </section>

          <section>
            <p className="eyebrow mb-3">Internal Notes</p>
            <Form method="post">
              <input type="hidden" name="intent" value="update-notes" />
              <textarea
                name="internalNotes"
                rows={4}
                defaultValue={order.internal_notes ?? ""}
                placeholder="Sourcing notes, quoted price, tracking info, etc."
                className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest mb-3"
              />
              <button type="submit" disabled={isSubmitting} className="btn-secondary disabled:opacity-60">Save Notes</button>
              {actionData?.saved === "update-notes" && <span className="ml-3 text-sm text-forest-dark">Saved.</span>}
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
              <a href={`https://wa.me/${order.whatsapp}`} target="_blank" rel="noreferrer" className="text-sm text-forest hover:underline block mt-2">
                Message on WhatsApp
              </a>
            )}
          </section>

          <section className="border border-line p-5">
            <p className="eyebrow mb-3">Delivery</p>
            <p className="text-sm capitalize">{order.delivery_method.replace("_", " ")}</p>
            {order.delivery_method === "local_delivery" && (
              <>
                <p className="text-sm text-taupe mt-1">
                  {order.address}<br />
                  {order.community_area}, {order.city_town}
                </p>
                {order.location_tier && (
                  <p className="text-xs text-taupe mt-1">
                    {LOCATION_TIER_LABELS[order.location_tier as LocationTier] ?? order.location_tier} &middot;{" "}
                    {SHIPMENT_SIZE_LABELS[order.shipment_size as ShipmentSize] ?? order.shipment_size}
                  </p>
                )}
              </>
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
