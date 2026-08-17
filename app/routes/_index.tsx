import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { getFeaturedProducts, getNewArrivals, getSettings } from "~/lib/db.server";
import { ProductCard } from "~/components/ProductCard";

export const meta: MetaFunction = () => [
  { title: "Drea Online Fashion — Style Made For You" },
  {
    name: "description",
    content:
      "Trinidad & Tobago's home for trendy, affordable women's fashion. Shop dresses, jumpsuits, sets and more, with easy island-wide delivery.",
  },
];

export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const [featured, newArrivals, settings] = await Promise.all([
    getFeaturedProducts(env, 8),
    getNewArrivals(env, 4),
    getSettings(env),
  ]);
  return json({ featured, newArrivals, settings });
}

const CATEGORIES = [
  { label: "New Arrivals", query: "?new=1", key: "new" },
  { label: "Dresses", query: "?category=dresses", key: "dresses" },
  { label: "Jumpsuits", query: "?category=jumpsuits", key: "jumpsuits" },
  { label: "Sets", query: "?category=sets", key: "sets" },
  { label: "Tops", query: "?category=tops", key: "tops" },
  { label: "Bottoms", query: "?category=bottoms", key: "bottoms" },
];

const WHY_SHOP = [
  { title: "Trendy Styles", body: "Fresh, on-trend pieces curated for the way you actually get dressed." },
  { title: "Affordable Fashion", body: "Boutique style without the boutique markup." },
  { title: "Easy Ordering", body: "Browse, pick your size, and check out in minutes — no account required." },
  { title: "T&T Delivery", body: "Local delivery and pickup, built for customers across Trinidad & Tobago." },
];

export default function Index() {
  const { featured, newArrivals, settings } = useLoaderData<typeof loader>();

  return (
    <>
      {/* Hero */}
      <section className="relative bg-forest text-ivory">
        <div className="container-page grid lg:grid-cols-2 gap-10 items-center py-16 lg:py-24">
          <div className="order-2 lg:order-1">
            <p className="eyebrow text-brass-light mb-4">Trinidad & Tobago Fashion</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-6">
              {settings.business_name}
            </h1>
            <p className="text-lg text-ivory/80 max-w-md mb-8 italic font-display">
              {settings.business_description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/shop" className="btn-brass">
                Shop Now
              </Link>
              <Link
                to="/shop?new=1"
                className="inline-flex items-center justify-center gap-2 border border-ivory/50 text-ivory px-7 py-3.5 text-sm tracking-wide uppercase font-semibold hover:bg-ivory hover:text-forest transition-colors duration-200"
              >
                Explore New Arrivals
              </Link>
            </div>
          </div>
          <div className="order-1 lg:order-2 aspect-[4/5] bg-forest-light/40 overflow-hidden">
            <img
              src="/images/placeholder-hero.svg"
              alt="Drea Online Fashion — new season styles"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Featured categories */}
      <section className="container-page py-14">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              to={`/shop${cat.query}`}
              className="group border border-line px-4 py-6 text-center hover:border-forest transition-colors"
            >
              <span className="text-sm tracking-wide uppercase group-hover:text-forest transition-colors">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl">Featured Styles</h2>
            <Link to="/shop?featured=1" className="text-sm tracking-wide uppercase text-forest hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} currencySymbol={settings.currency_symbol} />
            ))}
          </div>
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl">New Arrivals</h2>
            <Link to="/shop?new=1" className="text-sm tracking-wide uppercase text-forest hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} currencySymbol={settings.currency_symbol} />
            ))}
          </div>
        </section>
      )}

      {/* Why shop with us */}
      <section className="bg-surface border-y border-line mt-14">
        <div className="container-page py-16">
          <h2 className="text-2xl sm:text-3xl mb-10 text-center">Why Shop With Us</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {WHY_SHOP.map((item) => (
              <div key={item.title} className="text-center">
                <p className="font-display text-xl mb-2 text-forest-dark">{item.title}</p>
                <p className="text-sm text-taupe leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram CTA */}
      <section className="container-page py-16 text-center">
        <p className="eyebrow text-brass-dark mb-3">Follow Along</p>
        <h2 className="text-2xl sm:text-3xl mb-5">Follow @{settings.instagram_handle}</h2>
        <a
          href={`https://instagram.com/${settings.instagram_handle}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary"
        >
          View on Instagram
        </a>
      </section>
    </>
  );
}
