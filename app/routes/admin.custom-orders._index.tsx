import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { requireAdmin } from "~/lib/auth.server";
import { listCustomOrdersAdmin } from "~/lib/custom-orders.server";
import { getSettings } from "~/lib/db.server";
import { CUSTOM_ORDER_STATUS_LABELS, type CustomOrderStatus } from "~/lib/types";

export const meta: MetaFunction = () => [{ title: "Order What You Want — Drea Admin" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const [orders, settings] = await Promise.all([
    listCustomOrdersAdmin(env, { search, status }),
    getSettings(env),
  ]);
  return json({ orders, settings, search: search ?? "", status: status ?? "" });
}

export default function AdminCustomOrders() {
  const { orders, search, status } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl mb-2">Order What You Want</h1>
      <p className="text-taupe text-sm mb-6">Custom item requests from Fashion Nova, Amazon, and anywhere else.</p>

      <Form method="get" className="flex flex-wrap gap-2 mb-6">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search by order #, name, phone, or item"
          className="flex-1 min-w-[220px] border border-line px-3 py-2 text-sm focus:border-forest"
        />
        <select name="status" defaultValue={status} className="border border-line px-3 py-2 text-sm bg-surface">
          <option value="">All Statuses</option>
          {Object.entries(CUSTOM_ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" className="border border-charcoal px-4 text-sm uppercase tracking-wide hover:bg-charcoal hover:text-ivory transition-colors">
          Filter
        </button>
      </Form>

      {orders.length === 0 ? (
        <p className="text-taupe text-sm">No requests yet.</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {orders.map((order: any) => (
            <Link
              key={order.id}
              to={`/admin/custom-orders/${order.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-line/30 flex-wrap"
            >
              <div className="min-w-[130px]">
                <p className="text-sm font-medium">{order.order_number}</p>
                <p className="text-xs text-taupe">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="min-w-[160px]">
                <p className="text-sm">{order.customer_name}</p>
                <p className="text-xs text-taupe">{order.phone}</p>
              </div>
              <p className="text-sm text-charcoal/80 flex-1 min-w-[200px] truncate">{order.item_description}</p>
              <span className="text-[11px] uppercase tracking-wide bg-line px-2.5 py-1 whitespace-nowrap">
                {CUSTOM_ORDER_STATUS_LABELS[order.status as CustomOrderStatus] ?? order.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
