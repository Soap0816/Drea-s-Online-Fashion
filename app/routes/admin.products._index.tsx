import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData, useSearchParams, useNavigation } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { requireAdmin } from "~/lib/auth.server";
import { listAllProductsAdmin, setProductHidden, deleteProduct } from "~/lib/admin-db.server";
import { getSettings, imageUrl } from "~/lib/db.server";
import { formatMoney } from "~/lib/money";
import { CATEGORY_LABELS } from "~/lib/types";

export const meta: MetaFunction = () => [{ title: "Products — Drea Admin" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const [products, settings] = await Promise.all([listAllProductsAdmin(env, search), getSettings(env)]);
  return json({ products, settings, search: search ?? "" });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  const id = Number(form.get("id"));

  if (intent === "hide") await setProductHidden(env, id, true);
  if (intent === "unhide") await setProductHidden(env, id, false);
  if (intent === "delete") await deleteProduct(env, id);

  return redirect("/admin/products");
}

export default function AdminProducts() {
  const { products, settings, search } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl sm:text-3xl">Products</h1>
        <Link to="/admin/products/new" className="btn-primary">Add Product</Link>
      </div>

      <Form method="get" className="flex gap-2 mb-6 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search products"
          className="w-full border border-line px-3 py-2 text-sm focus:border-forest"
        />
        <button type="submit" className="border border-charcoal px-4 text-sm uppercase tracking-wide hover:bg-charcoal hover:text-ivory transition-colors">
          Go
        </button>
      </Form>

      {products.length === 0 ? (
        <div className="border border-dashed border-line p-12 text-center">
          <p className="text-taupe mb-4">No products yet.</p>
          <Link to="/admin/products/new" className="btn-primary">Add Your First Product</Link>
        </div>
      ) : (
        <div className="border border-line divide-y divide-line">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-4 px-4 py-3 flex-wrap">
              <div className="h-14 w-11 flex-shrink-0 bg-line overflow-hidden">
                <img src={imageUrl(product.images[0]?.image_key)} alt="" className="h-full w-full object-cover" />
              </div>

              <div className="flex-1 min-w-[180px]">
                <Link to={`/admin/products/${product.id}`} className="text-sm font-medium hover:text-forest">
                  {product.name}
                </Link>
                <p className="text-xs text-taupe mt-0.5">
                  {CATEGORY_LABELS[product.category] ?? product.category} &middot; {formatMoney(product.price_cents, settings.currency_symbol)}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {product.hidden && (
                  <span className="text-[11px] uppercase tracking-wide bg-charcoal text-ivory px-2 py-1">Hidden</span>
                )}
                {product.featured && (
                  <span className="text-[11px] uppercase tracking-wide bg-brass text-ivory px-2 py-1">Featured</span>
                )}
                {product.new_arrival && (
                  <span className="text-[11px] uppercase tracking-wide bg-forest text-ivory px-2 py-1">New</span>
                )}
                {product.availability !== "available" && (
                  <span className="text-[11px] uppercase tracking-wide bg-error text-ivory px-2 py-1">
                    {product.availability === "discontinued" ? "Discontinued" : "Unavailable"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <Link to={`/admin/products/${product.id}`} className="text-xs text-forest hover:underline">
                  Edit
                </Link>
                <Form method="post">
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="intent" value={product.hidden ? "unhide" : "hide"} />
                  <button type="submit" className="text-xs text-taupe hover:text-forest" disabled={navigation.state !== "idle"}>
                    {product.hidden ? "Unhide" : "Hide"}
                  </button>
                </Form>
                <Form
                  method="post"
                  onSubmit={(e) => {
                    if (!confirm(`Delete "${product.name}"? This can't be undone.`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="intent" value="delete" />
                  <button type="submit" className="text-xs text-error hover:underline" disabled={navigation.state !== "idle"}>
                    Delete
                  </button>
                </Form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
