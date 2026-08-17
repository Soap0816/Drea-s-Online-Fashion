import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { requireAdmin } from "~/lib/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const admin = await requireAdmin(request, env);
  return json({ admin });
}

const NAV_ITEMS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/custom-orders", label: "Order What You Want" },
  { to: "/admin/settings", label: "Settings" },
];

export default function AdminLayout() {
  const { admin } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row">
      <aside className="md:w-64 flex-shrink-0 bg-forest text-ivory md:min-h-screen">
        <div className="p-6 border-b border-ivory/15">
          <Link to="/admin" className="font-display text-xl">Drea Admin</Link>
          <p className="text-xs text-ivory/60 mt-1">{admin.email}</p>
        </div>
        <nav className="p-4 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-4 py-2.5 text-sm rounded-sm whitespace-nowrap ${
                  isActive ? "bg-ivory text-forest font-semibold" : "text-ivory/80 hover:bg-ivory/10"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-ivory/15 hidden md:block">
          <Link to="/" className="text-xs text-ivory/70 hover:text-ivory block mb-3">
            &larr; View storefront
          </Link>
          <Form method="post" action="/admin/logout">
            <button type="submit" className="text-xs text-ivory/70 hover:text-ivory underline">
              Log Out
            </button>
          </Form>
        </div>
      </aside>

      <main className="flex-1 p-5 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
