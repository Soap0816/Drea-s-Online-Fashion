import type { Env } from "./env.server";
import type { CartItem } from "./cart.server";
import { getProductsByIds } from "./db.server";
import { resolveStockStatus } from "./types";

export interface ResolvedCartLine {
  productId: number;
  slug: string;
  name: string;
  size: string;
  colour: string;
  quantity: number;
  imageKey: string | null;
  /** Current price from the database — always what's actually charged. */
  unitPriceCents: number;
  lineTotalCents: number;
  isPreorder: boolean;
  /** True if the product no longer exists, is hidden, or is out of stock
   *  (not pre-orderable) — these block checkout entirely. */
  isUnavailable: boolean;
  unavailableReason?: string;
}

export interface ResolvedCart {
  lines: ResolvedCartLine[];
  subtotalCents: number;
  hasUnavailableItems: boolean;
  hasPreorderItems: boolean;
}

export async function resolveCart(env: Env, cart: CartItem[]): Promise<ResolvedCart> {
  const products = await getProductsByIds(env, cart.map((i) => i.productId));

  const lines: ResolvedCartLine[] = cart.map((item) => {
    const product = products.get(item.productId);

    if (!product || product.hidden) {
      return {
        productId: item.productId,
        slug: item.slug,
        name: item.name,
        size: item.size,
        colour: item.colour,
        quantity: item.quantity,
        imageKey: item.imageKey,
        unitPriceCents: item.priceCentsAtAdd,
        lineTotalCents: item.priceCentsAtAdd * item.quantity,
        isPreorder: false,
        isUnavailable: true,
        unavailableReason: "No longer available",
      };
    }

    const stockStatus = resolveStockStatus(product, item.size, item.colour);
    const isUnavailable = stockStatus === "out_of_stock";

    return {
      productId: item.productId,
      slug: product.slug,
      name: product.name,
      size: item.size,
      colour: item.colour,
      quantity: item.quantity,
      imageKey: product.images[0]?.image_key ?? null,
      unitPriceCents: product.price_cents,
      lineTotalCents: product.price_cents * item.quantity,
      isPreorder: stockStatus === "preorder",
      isUnavailable,
      unavailableReason: isUnavailable ? "Out of stock" : undefined,
    };
  });

  const subtotalCents = lines.filter((l) => !l.isUnavailable).reduce((sum, l) => sum + l.lineTotalCents, 0);

  return {
    lines,
    subtotalCents,
    hasUnavailableItems: lines.some((l) => l.isUnavailable),
    hasPreorderItems: lines.some((l) => l.isPreorder && !l.isUnavailable),
  };
}
