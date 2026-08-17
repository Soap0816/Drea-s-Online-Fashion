import { useEffect, useMemo, useState } from "react";
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData, Link, useFetcher, useNavigate } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { getProductBySlug, getSettings } from "~/lib/db.server";
import { imageUrl } from "~/lib/image";
import { formatMoney } from "~/lib/money";
import { resolveStockStatus } from "~/lib/types";
import { showToast } from "~/components/Toast";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Product — Drea Online Fashion" }];
  const { product } = data;
  return [
    { title: `${product.name} — Drea Online Fashion` },
    { name: "description", content: product.description ?? `Shop the ${product.name} from Drea Online Fashion.` },
    { property: "og:title", content: product.name },
    { property: "og:type", content: "product" },
  ];
};

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const product = await getProductBySlug(env, params.slug!);
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }
  const settings = await getSettings(env);
  return json({ product, settings });
}

const STOCK_LABEL: Record<string, string> = {
  in_stock: "In Stock",
  preorder: "Available to Pre-Order",
  out_of_stock: "Out of Stock",
};

export default function ProductDetail() {
  const { product, settings } = useLoaderData<typeof loader>();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColour, setSelectedColour] = useState<string | null>(product.colours[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const fetcher = useFetcher<{ ok?: boolean; error?: string; isPreorder?: boolean }>();
  const navigate = useNavigate();

  const images = product.images.length > 0 ? product.images : [{ id: 0, image_key: "", alt_text: product.name }];
  const isSubmitting = fetcher.state !== "idle";

  const stockStatus = useMemo(() => {
    if (!selectedSize) return null;
    return resolveStockStatus(product, selectedSize, selectedColour ?? "");
  }, [product, selectedSize, selectedColour]);

  const canOrder = stockStatus === "in_stock" || stockStatus === "preorder";
  const isPreorder = stockStatus === "preorder";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: settings.currency_code,
      price: (product.price_cents / 100).toFixed(2),
      availability: product.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      setJustAdded(true);
      showToast(fetcher.data.isPreorder ? "Added as a pre-order." : "Added to your cart.", "success");
      const timer = setTimeout(() => setJustAdded(false), 3000);
      return () => clearTimeout(timer);
    }
    if (fetcher.state === "idle" && fetcher.data?.error) {
      showToast(fetcher.data.error, "error");
    }
  }, [fetcher.state, fetcher.data]);

  function submitAddToCart(redirectToCart: boolean) {
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    fetcher.submit(
      { slug: product.slug, size: selectedSize, colour: selectedColour ?? "", quantity: String(quantity) },
      { method: "post", action: "/api/cart/add" }
    );
    if (redirectToCart) {
      navigate("/cart");
    }
  }

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <nav className="text-xs text-taupe mb-8 flex gap-2">
        <Link to="/" className="hover:text-forest">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-forest">Shop</Link>
        <span>/</span>
        <span className="text-charcoal">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Gallery */}
        <div>
          <div className="aspect-[3/4] bg-line overflow-hidden mb-3">
            <img
              src={imageUrl(images[activeImage]?.image_key)}
              alt={images[activeImage]?.alt_text ?? product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-16 flex-shrink-0 border overflow-hidden ${
                    activeImage === i ? "border-forest" : "border-line"
                  }`}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={imageUrl(img.image_key)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:pt-2">
          <h1 className="text-3xl sm:text-4xl mb-3">{product.name}</h1>
          <p className="text-2xl text-forest-dark font-semibold mb-6">
            {formatMoney(product.price_cents, settings.currency_symbol)}
          </p>

          {product.description && (
            <p className="text-charcoal/80 leading-relaxed mb-8">{product.description}</p>
          )}

          {/* Colour selection */}
          {product.colours.length > 0 && (
            <div className="mb-6">
              <p className="eyebrow mb-3">Colour{selectedColour ? `: ${selectedColour}` : ""}</p>
              <div className="flex flex-wrap gap-2">
                {product.colours.map((colour) => (
                  <button
                    key={colour}
                    onClick={() => setSelectedColour(colour)}
                    className={`h-10 px-4 flex items-center justify-center text-sm border transition-colors ${
                      selectedColour === colour ? "border-forest bg-forest text-ivory" : "border-line hover:border-forest"
                    }`}
                  >
                    {colour}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size selection */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">Select Size</p>
              {sizeError && <p className="text-xs text-error">Please select your size before ordering.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => {
                const status = resolveStockStatus(product, size, selectedColour ?? "");
                const disabled = status === "out_of_stock";
                return (
                  <button
                    key={size}
                    onClick={() => {
                      if (disabled) return;
                      setSelectedSize(size);
                      setSizeError(false);
                    }}
                    disabled={disabled}
                    className={`h-11 min-w-[2.75rem] px-3 flex items-center justify-center text-sm border transition-colors ${
                      selectedSize === size
                        ? "border-forest bg-forest text-ivory"
                        : disabled
                        ? "border-line text-taupe/50 line-through cursor-not-allowed"
                        : "border-line hover:border-forest"
                    }`}
                    title={disabled ? "Out of stock" : undefined}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {stockStatus && (
            <p
              className={`text-xs uppercase tracking-wide mb-6 inline-block px-3 py-1.5 ${
                stockStatus === "in_stock"
                  ? "bg-forest/10 text-forest-dark"
                  : stockStatus === "preorder"
                  ? "bg-brass/15 text-brass-dark"
                  : "bg-charcoal text-ivory"
              }`}
            >
              {STOCK_LABEL[stockStatus]}
            </p>
          )}

          {isPreorder && (
            <p className="text-sm text-charcoal/70 mb-6 -mt-3">
              This item is sourced after ordering. We'll confirm timing once your order comes in — your checkout
              details (name, phone, address) go straight to us, nothing further needed from you right now.
            </p>
          )}

          {/* Quantity */}
          <div className="mb-8">
            <p className="eyebrow mb-3">Quantity</p>
            <div className="inline-flex items-center border border-line">
              <button
                className="h-11 w-11 flex items-center justify-center text-lg hover:bg-line/60"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center text-sm">{quantity}</span>
              <button
                className="h-11 w-11 flex items-center justify-center text-lg hover:bg-line/60"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <button
              onClick={() => submitAddToCart(false)}
              disabled={(!!selectedSize && !canOrder) || isSubmitting}
              className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : isPreorder ? "Pre-Order This Item" : "Add to Cart"}
            </button>
            <button
              onClick={() => submitAddToCart(true)}
              disabled={(!!selectedSize && !canOrder) || isSubmitting}
              className="btn-brass flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Buy Now
            </button>
          </div>
          {justAdded && (
            <p className="text-sm text-forest-dark mb-5" role="status">
              {fetcher.data?.isPreorder ? "Added as a pre-order." : "Added to your cart."}{" "}
              <Link to="/cart" className="underline">View cart</Link>
            </p>
          )}
          {fetcher.data?.error && (
            <p className="text-sm text-error mb-5" role="alert">{fetcher.data.error}</p>
          )}

          <div className="border-t border-line pt-6 mt-3 space-y-3 text-sm text-charcoal/70">
            <p>{settings.checkout_notice}</p>
            {settings.whatsapp_number && (
              <p>
                Questions about this item?{" "}
                <a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noreferrer" className="text-forest underline">
                  Message us on WhatsApp
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
