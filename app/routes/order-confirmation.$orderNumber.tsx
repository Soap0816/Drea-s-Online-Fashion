import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { getOrderByNumber } from "~/lib/orders.server";
import { getSettings } from "~/lib/db.server";
import { formatMoney } from "~/lib/money";
import { LOCATION_TIER_LABELS, SHIPMENT_SIZE_LABELS, type LocationTier, type ShipmentSize } from "~/lib/types";

export const meta: MetaFunction = () => [{ title: "Order Received — Drea Online Fashion" }];

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  local_delivery: "Local Delivery (oDeliver)",
  pickup: "Pickup",
};

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const order = await getOrderByNumber(env, params.orderNumber!);
  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }
  const settings = await getSettings(env);
  return json({ order, settings });
}

export default function OrderConfirmation() {
  const { order, settings } = useLoaderData<typeof loader>();
  const hasPreorderItems = order.items.some((i) => i.is_preorder);

  return (
    <div className="container-page py-16 max-w-2xl">
      <div className="text-center mb-10">
        <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-forest text-ivory flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="eyebrow mb-3">Order Received!</p>
        <h1 className="text-3xl sm:text-4xl mb-3">Thank you for shopping with {settings.business_name}</h1>
        <p className="text-taupe">
          Your order number is <span className="font-semibold text-charcoal">{order.order_number}</span>
        </p>
        <p className="text-charcoal/80 mt-4 max-w-md mx-auto">
          We will contact you to confirm availability, delivery details and payment arrangements.
        </p>
        {order.payment_method === "card" && (
          <p className="text-sm text-brass-dark mt-3">
            We'll send you a secure payment link shortly to complete your card payment.
          </p>
        )}
      </div>

      <div className="border border-line p-6 mb-8">
        <p className="eyebrow mb-4">Order Details</p>
        <div className="divide-y divide-line">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex justify-between text-sm">
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
        <div className="border-t border-line mt-3 pt-3 space-y-1.5 text-sm">
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
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Total</span>
            <span>{formatMoney(order.total_cents, settings.currency_symbol)}</span>
          </div>
        </div>
        {hasPreorderItems && (
          <p className="text-xs text-brass-dark mt-3 pt-3 border-t border-line">
            This order includes pre-order item(s), sourced after ordering. We'll confirm timing with you.
          </p>
        )}
      </div>

      <div className="border border-line p-6 mb-10 text-sm space-y-1.5">
        <p className="eyebrow mb-3">Delivery To</p>
        <p>{order.customer_name} &middot; {order.phone}</p>
        <p>{DELIVERY_METHOD_LABELS[order.delivery_method] ?? order.delivery_method}</p>
        {order.delivery_method === "local_delivery" && (
          <>
            <p className="text-charcoal/70">
              {order.address}, {order.community_area}, {order.city_town}
            </p>
            {order.location_tier && order.shipment_size && (
              <p className="text-taupe text-xs">
                {LOCATION_TIER_LABELS[order.location_tier as LocationTier] ?? order.location_tier} area &middot;{" "}
                {SHIPMENT_SIZE_LABELS[order.shipment_size as ShipmentSize] ?? order.shipment_size}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Link to="/shop" className="btn-primary">Continue Shopping</Link>
        {settings.whatsapp_number && (
          <a
            href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(`Hi! I'd like to follow up on order ${order.order_number}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Message Us About This Order
          </a>
        )}
      </div>
    </div>
  );
}
