import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { requireAdmin } from "~/lib/auth.server";
import { getOverviewStats } from "~/lib/admin-db.server";
import { getSettings } from "~/lib/db.server";
import { formatMoney } from "~/lib/money";
import { ORDER_STATUS_LABELS } from "~/lib/types";

export const meta: MetaFunction = () => [{ title: "Overview — Drea Admin" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const [stats, settings] = await Promise.all([getOverviewStats(env), getSettings(env)]);
  return json({ stats, settings });
}

export default function AdminOverview() {
  const { stats, settings } = useLoaderData<typeof loader>();

  const cards = [
    { label: "Total Orders", value: stats.totalOrders },
    { label: "New Orders", value: stats.newOrders },
    { label: "Pending Orders", value: stats.pendingOrders },
    { label: "Completed Orders", value: stats.completedOrders },
  ];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl mb-1">Overview</h1>
      <p className="text-taupe text-sm mb-8">Welcome back. Here's what's happening with your store.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="border border-line p-5">
            <p className="text-2xl font-display">{card.value}</p>
            <p className="text-xs text-taupe uppercase tracking-wide mt-1">{card.label}</p>
          </div>
        ))}
        <div className="border border-line p-5 col-span-2 lg:col-span-4">
          <p className="text-2xl font-display">{formatMoney(stats.totalSalesCents, settings.currency_symbol)}</p>
          <p className="text-xs text-taupe uppercase tracking-wide mt-1">Total Order Value</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">Recent Orders</p>
            <Link to="/admin/orders" className="text-xs text-forest hover:underline">View All</Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-taupe">No orders yet.</p>
          ) : (
            <div className="border border-line divide-y divide-line">
              {stats.recentOrders.map((order: any) => (
                <Link
                  key={order.id}
                  to={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-line/30"
                >
                  <div>
                    <p className="text-sm font-medium">{order.order_number}</p>
                    <p className="text-xs text-taupe">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatMoney(order.total_cents, settings.currency_symbol)}</p>
                    <p className="text-xs text-taupe">{ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">Recent Products</p>
            <Link to="/admin/products" className="text-xs text-forest hover:underline">View All</Link>
          </div>
          {stats.recentProducts.length === 0 ? (
            <p className="text-sm text-taupe">No products yet.</p>
          ) : (
            <div className="border border-line divide-y divide-line">
              {stats.recentProducts.map((product: any) => (
                <Link
                  key={product.id}
                  to={`/admin/products/${product.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-line/30"
                >
                  <p className="text-sm">{product.name}</p>
                  <p className="text-sm text-taupe">{formatMoney(product.price_cents, settings.currency_symbol)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
