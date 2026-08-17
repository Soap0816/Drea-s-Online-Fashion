import { useState } from "react";
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { listShopProducts, getSettings, type ShopFilters } from "~/lib/db.server";
import { CATEGORY_LABELS, type Product } from "~/lib/types";
import { ProductCard } from "~/components/ProductCard";
import { QuickViewModal } from "~/components/QuickViewModal";

export const meta: MetaFunction = () => [
  { title: "Shop All — Drea Online Fashion" },
  { name: "description", content: "Browse dresses, jumpsuits, matching sets, tops and bottoms from Drea Online Fashion." },
];

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const CATEGORIES = ["dresses", "jumpsuits", "sets", "tops", "bottoms"];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const url = new URL(request.url);

  const category = url.searchParams.get("category") ?? undefined;
  const size = url.searchParams.get("size") ?? undefined;
  const search = url.searchParams.get("q") ?? undefined;
  const sort = (url.searchParams.get("sort") as ShopFilters["sort"]) ?? undefined;
  const isNew = url.searchParams.get("new") === "1";
  const isFeatured = url.searchParams.get("featured") === "1";
  const minPrice = url.searchParams.get("min");
  const maxPrice = url.searchParams.get("max");

  const filters: ShopFilters = {
    category,
    size,
    search,
    sort: sort ?? (isFeatured ? "featured" : isNew ? "newest" : "featured"),
    minPriceCents: minPrice ? Number(minPrice) * 100 : undefined,
    maxPriceCents: maxPrice ? Number(maxPrice) * 100 : undefined,
  };

  let products = await listShopProducts(env, filters);
  if (isNew) products = products.filter((p) => p.new_arrival);
  if (isFeatured) products = products.filter((p) => p.featured);

  const settings = await getSettings(env);

  return json({ products, settings, activeFilters: { category, size, search, sort: filters.sort, isNew, isFeatured } });
}

export default function Shop() {
  const { products, settings, activeFilters } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl mb-2">
          {activeFilters.category ? CATEGORY_LABELS[activeFilters.category] ?? activeFilters.category : "Shop All"}
        </h1>
        <p className="text-taupe text-sm">{products.length} {products.length === 1 ? "item" : "items"}</p>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-10">
        {/* Filters */}
        <aside className="space-y-8">
          <Form method="get" className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={activeFilters.search ?? ""}
              placeholder="Search products"
              className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
            />
            <button type="submit" className="border border-charcoal px-4 text-sm uppercase tracking-wide hover:bg-charcoal hover:text-ivory transition-colors">
              Go
            </button>
          </Form>

          <div>
            <p className="eyebrow mb-3">Category</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/shop" className={!activeFilters.category ? "text-forest font-semibold" : "text-charcoal/80 hover:text-forest"}>
                  All
                </a>
              </li>
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <a
                    href={`/shop?category=${cat}`}
                    className={activeFilters.category === cat ? "text-forest font-semibold" : "text-charcoal/80 hover:text-forest"}
                  >
                    {CATEGORY_LABELS[cat]}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">Size</p>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((size) => {
                const params = new URLSearchParams(searchParams);
                params.set("size", size);
                const active = activeFilters.size === size;
                return (
                  <a
                    key={size}
                    href={`/shop?${params.toString()}`}
                    className={`h-9 w-9 flex items-center justify-center text-xs border ${
                      active ? "border-forest bg-forest text-ivory" : "border-line hover:border-forest"
                    }`}
                  >
                    {size}
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <a href="/shop?new=1" className={`block text-sm mb-2 ${activeFilters.isNew ? "text-forest font-semibold" : "text-charcoal/80 hover:text-forest"}`}>
              New Arrivals
            </a>
            <a href="/shop?featured=1" className={`block text-sm ${activeFilters.isFeatured ? "text-forest font-semibold" : "text-charcoal/80 hover:text-forest"}`}>
              Featured
            </a>
          </div>
        </aside>

        {/* Product grid */}
        <div>
          <div className="flex justify-end mb-6">
            <label className="text-sm flex items-center gap-2">
              <span className="text-taupe">Sort by</span>
              <select
                defaultValue={activeFilters.sort}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams);
                  params.set("sort", e.target.value);
                  window.location.search = params.toString();
                }}
                className="border border-line px-2 py-1.5 text-sm"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </label>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-line">
              <p className="font-display text-xl mb-2">No products found</p>
              <p className="text-taupe text-sm mb-6">Try a different search or clear your filters.</p>
              <a href="/shop" className="btn-secondary">Clear Filters</a>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currencySymbol={settings.currency_symbol}
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          currencySymbol={settings.currency_symbol}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
}
