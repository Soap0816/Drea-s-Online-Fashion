import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/lib/env.server";
import { getCart, serializeCart, addToCart, cartItemCount } from "~/lib/cart.server";
import { getProductBySlug } from "~/lib/db.server";
import { resolveStockStatus } from "~/lib/types";

/**
 * POST /api/cart/add — used by a fetcher.Form on the product page so adding
 * to cart doesn't navigate away. Re-validates the product and its stock
 * status server-side rather than trusting the client payload.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const env = context.cloudflare.env as Env;
  const form = await request.formData();
  const slug = String(form.get("slug") || "");
  const size = String(form.get("size") || "");
  const colour = String(form.get("colour") || "");
  const quantity = Math.max(1, Number(form.get("quantity")) || 1);

  const product = await getProductBySlug(env, slug);
  if (!product) {
    return json({ error: "Product not found" }, { status: 404 });
  }
  if (!size || !product.sizes.includes(size)) {
    return json({ error: "Please select a valid size." }, { status: 400 });
  }
  if (colour && !product.colours.includes(colour)) {
    return json({ error: "Please select a valid colour." }, { status: 400 });
  }

  const stockStatus = resolveStockStatus(product, size, colour);
  if (stockStatus === "out_of_stock") {
    return json({ error: "This item is out of stock in that size/colour." }, { status: 400 });
  }

  const cart = await getCart(request);
  const updated = addToCart(cart, {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    size,
    colour,
    quantity,
    priceCentsAtAdd: product.price_cents,
    imageKey: product.images[0]?.image_key ?? null,
    isPreorder: stockStatus === "preorder",
  });

  return json(
    { ok: true, cartCount: cartItemCount(updated), isPreorder: stockStatus === "preorder" },
    { headers: { "Set-Cookie": await serializeCart(updated) } }
  );
}
