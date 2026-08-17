import { useEffect, useMemo, useState } from "react";
import { Link, useFetcher } from "@remix-run/react";
import type { Product } from "~/lib/types";
import { resolveStockStatus } from "~/lib/types";
import { formatMoney } from "~/lib/money";
import { imageUrl } from "~/lib/db.server";
import { showToast } from "~/components/Toast";

const STOCK_LABEL: Record<string, string> = {
  in_stock: "In Stock",
  preorder: "Available to Pre-Order",
  out_of_stock: "Out of Stock",
};

export function QuickViewModal({
  product,
  currencySymbol,
  onClose,
}: {
  product: Product;
  currencySymbol: string;
  onClose: () => void;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColour, setSelectedColour] = useState<string>(product.colours[0] ?? "");
  const [sizeError, setSizeError] = useState(false);
  const fetcher = useFetcher<{ ok?: boolean; error?: string; isPreorder?: boolean }>();
  const isSubmitting = fetcher.state !== "idle";

  const stockStatus = useMemo(() => {
    if (!selectedSize) return null;
    return resolveStockStatus(product, selectedSize, selectedColour);
  }, [product, selectedSize, selectedColour]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      showToast(fetcher.data.isPreorder ? "Added as a pre-order." : "Added to your cart.", "success");
      onClose();
    }
    if (fetcher.state === "idle" && fetcher.data?.error) {
      showToast(fetcher.data.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  function handleAdd() {
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    fetcher.submit(
      { slug: product.slug, size: selectedSize, colour: selectedColour, quantity: "1" },
      { method: "post", action: "/api/cart/add" }
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-charcoal/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${product.name}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ivory max-w-2xl w-full max-h-[90vh] overflow-y-auto grid sm:grid-cols-2"
      >
        <div className="aspect-[3/4] bg-line">
          <img
            src={imageUrl(product.images[0]?.image_key)}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="p-6 relative">
          <button
            onClick={onClose}
            aria-label="Close quick view"
            className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center text-lg hover:bg-line/60"
          >
            &times;
          </button>

          <h3 className="text-xl mb-2 pr-8">{product.name}</h3>
          <p className="text-lg font-semibold text-forest-dark mb-4">
            {formatMoney(product.price_cents, currencySymbol)}
          </p>

          {product.colours.length > 0 && (
            <div className="mb-4">
              <p className="eyebrow mb-2">Colour: {selectedColour}</p>
              <div className="flex flex-wrap gap-2">
                {product.colours.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColour(c)}
                    className={`h-9 px-3 text-xs border ${selectedColour === c ? "border-forest bg-forest text-ivory" : "border-line hover:border-forest"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="eyebrow">Size</p>
              {sizeError && <p className="text-xs text-error">Please select a size.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => {
                const status = resolveStockStatus(product, size, selectedColour);
                const disabled = status === "out_of_stock";
                return (
                  <button
                    key={size}
                    disabled={disabled}
                    onClick={() => {
                      setSelectedSize(size);
                      setSizeError(false);
                    }}
                    className={`h-9 min-w-[2.25rem] px-2.5 text-xs border ${
                      selectedSize === size
                        ? "border-forest bg-forest text-ivory"
                        : disabled
                        ? "border-line text-taupe/50 line-through cursor-not-allowed"
                        : "border-line hover:border-forest"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {stockStatus && (
            <p className="text-xs text-taupe mb-4">{STOCK_LABEL[stockStatus]}</p>
          )}

          <button
            onClick={handleAdd}
            disabled={isSubmitting || stockStatus === "out_of_stock"}
            className="btn-primary w-full mb-3 disabled:opacity-40"
          >
            {isSubmitting ? "Adding..." : "Add to Cart"}
          </button>
          <Link to={`/shop/${product.slug}`} className="block text-center text-xs text-forest hover:underline">
            View full details
          </Link>
        </div>
      </div>
    </div>
  );
}
