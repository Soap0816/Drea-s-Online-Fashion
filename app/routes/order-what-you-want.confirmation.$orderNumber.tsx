import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { getCustomOrderByNumber } from "~/lib/custom-orders.server";
import { getSettings } from "~/lib/db.server";
import { formatMoney } from "~/lib/money";

export const meta: MetaFunction = () => [{ title: "Request Received — Drea Online Fashion" }];

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const order = await getCustomOrderByNumber(env, params.orderNumber!);
  if (!order) {
    throw new Response("Request not found", { status: 404 });
  }
  const settings = await getSettings(env);
  return json({ order, settings });
}

export default function CustomOrderConfirmation() {
  const { order, settings } = useLoaderData<typeof loader>();

  return (
    <div className="container-page py-16 max-w-2xl">
      <div className="text-center mb-10">
        <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-brass text-ivory flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="eyebrow mb-3">Request Received!</p>
        <h1 className="text-3xl sm:text-4xl mb-3">Thanks for your order request</h1>
        <p className="text-taupe">
          Your reference number is <span className="font-semibold text-charcoal">{order.order_number}</span>
        </p>
        <p className="text-charcoal/80 mt-4 max-w-md mx-auto">
          We'll review your request, confirm pricing and availability, and follow up by phone or WhatsApp before
          ordering anything.
        </p>
      </div>

      <div className="border border-line p-6 mb-10 text-sm space-y-2">
        <p className="eyebrow mb-3">What You Asked For</p>
        <p>{order.item_description}</p>
        {order.item_link && (
          <p className="text-taupe break-all">{order.item_link}</p>
        )}
        <p className="text-taupe">Quantity: {order.quantity}</p>
        {order.estimated_budget_cents && (
          <p className="text-taupe">
            Estimated price you provided: {formatMoney(order.estimated_budget_cents, settings.currency_symbol)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Link to="/shop" className="btn-primary">Continue Shopping</Link>
        {settings.whatsapp_number && (
          <a
            href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(`Hi! I'd like to follow up on request ${order.order_number}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Message Us About This Request
          </a>
        )}
      </div>
    </div>
  );
}
