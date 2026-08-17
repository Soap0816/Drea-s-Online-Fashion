import { Link } from "@remix-run/react";
import type { Product } from "~/lib/types";
import { formatMoney } from "~/lib/money";
import { imageUrl } from "~/lib/image";

const AVAILABILITY_LABEL: Record<Product["availability"], string> = {
  available: "Available to Order",
  temporarily_unavailable: "Temporarily Unavailable",
  discontinued: "Discontinued",
};

export function ProductCard({
  product,
  currencySymbol = "TT$",
  onQuickView,
}: {
  product: Product;
  currencySymbol?: string;
  onQuickView?: (product: Product) => void;
}) {
  const cover = product.images[0];
  const isOrderable = product.availability === "available";

  return (
    <Link
      to={`/shop/${product.slug}`}
      className="group block"
      aria-label={`${product.name}, ${formatMoney(product.price_cents, currencySymbol)}`}
    >
      <div className="relative aspect-[3/4] bg-line overflow-hidden">
        <img
          src={imageUrl(cover?.image_key)}
          alt={cover?.alt_text ?? product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.new_arrival && (
          <span className="absolute top-3 left-3 bg-forest text-ivory text-[11px] tracking-wide uppercase px-2.5 py-1">
            New
          </span>
        )}
        {!isOrderable && (
          <span className="absolute inset-x-0 bottom-0 bg-charcoal/85 text-ivory text-[11px] tracking-wide uppercase text-center py-1.5">
            {AVAILABILITY_LABEL[product.availability]}
          </span>
        )}
        {onQuickView && isOrderable && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(product);
            }}
            className="absolute inset-x-2 bottom-2 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity bg-ivory text-charcoal text-xs tracking-wide uppercase py-2.5 hover:bg-forest hover:text-ivory"
          >
            Quick View
          </button>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-sm sm:text-base leading-snug">{product.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-forest-dark">
            {formatMoney(product.price_cents, currencySymbol)}
          </p>
          {product.sizes.length > 0 && (
            <p className="text-xs text-taupe">{product.sizes.join(" · ")}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
