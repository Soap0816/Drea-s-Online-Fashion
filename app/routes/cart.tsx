import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { getCart, serializeCart, updateCartQuantity, removeFromCart } from "~/lib/cart.server";
import { resolveCart } from "~/lib/cart-resolve.server";
import { getSettings } from "~/lib/db.server";
import { imageUrl } from "~/lib/image";
import { formatMoney } from "~/lib/money";

export const meta: MetaFunction = () => [{ title: "Your Cart — Drea Online Fashion" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const cart = await getCart(request);
  const [resolved, settings] = await Promise.all([resolveCart(env, cart), getSettings(env)]);
  return json({ resolved, settings });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  const productId = Number(form.get("productId"));
  const size = String(form.get("size") || "");
  const colour = String(form.get("colour") || "");

  let cart = await getCart(request);

  if (intent === "update") {
    const quantity = Math.max(0, Number(form.get("quantity")) || 0);
    cart = updateCartQuantity(cart, productId, size, colour, quantity);
  } else if (intent === "remove") {
    cart = removeFromCart(cart, productId, size, colour);
  }

  return redirect("/cart", { headers: { "Set-Cookie": await serializeCart(cart) } });
}

export default function Cart() {
  const { resolved, settings } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  if (resolved.lines.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <p className="font-display text-2xl mb-3">Your cart is empty</p>
        <p className="text-taupe mb-8">Browse the shop to find your next favorite look.</p>
        <Link to="/shop" className="btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl sm:text-4xl mb-8">Your Cart</h1>

      <div className="grid lg:grid-cols-[1fr_340px] gap-10">
        <div className="divide-y divide-line border-y border-line">
          {resolved.lines.map((line) => (
            <div key={`${line.productId}-${line.size}-${line.colour}`} className="py-5 flex gap-4">
              <Link to={`/shop/${line.slug}`} className="w-20 h-24 sm:w-24 sm:h-28 flex-shrink-0 bg-line overflow-hidden">
                <img src={imageUrl(line.imageKey)} alt={line.name} className="h-full w-full object-cover" />
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link to={`/shop/${line.slug}`} className="text-sm sm:text-base hover:text-forest">
                      {line.name}
                    </Link>
                    <p className="text-xs text-taupe mt-1">
                      Size: {line.size}{line.colour ? ` · Colour: ${line.colour}` : ""}
                    </p>
                    {line.isPreorder && (
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-wide bg-brass/15 text-brass-dark px-2 py-0.5">
                        Pre-Order
                      </span>
                    )}
                    {line.isUnavailable && (
                      <p className="text-xs text-error mt-1">{line.unavailableReason} — remove to check out</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold whitespace-nowrap">
                    {formatMoney(line.lineTotalCents, settings.currency_symbol)}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-4">
                  <Form method="post" className="flex items-center border border-line">
                    <input type="hidden" name="intent" value="update" />
                    <input type="hidden" name="productId" value={line.productId} />
                    <input type="hidden" name="size" value={line.size} />
                    <input type="hidden" name="colour" value={line.colour} />
                    <button
                      type="submit"
                      name="quantity"
                      value={line.quantity - 1}
                      className="h-9 w-9 flex items-center justify-center hover:bg-line/60"
                      aria-label="Decrease quantity"
                      disabled={isSubmitting}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{line.quantity}</span>
                    <button
                      type="submit"
                      name="quantity"
                      value={line.quantity + 1}
                      className="h-9 w-9 flex items-center justify-center hover:bg-line/60"
                      aria-label="Increase quantity"
                      disabled={isSubmitting}
                    >
                      +
                    </button>
                  </Form>

                  <Form method="post">
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="productId" value={line.productId} />
                    <input type="hidden" name="size" value={line.size} />
                    <input type="hidden" name="colour" value={line.colour} />
                    <button type="submit" className="text-xs text-taupe hover:text-error underline" disabled={isSubmitting}>
                      Remove
                    </button>
                  </Form>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 h-fit border border-line p-6">
          <p className="eyebrow mb-4">Order Summary</p>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-taupe">Subtotal</span>
            <span>{formatMoney(resolved.subtotalCents, settings.currency_symbol)}</span>
          </div>
          <p className="text-xs text-taupe mb-4">Delivery fee calculated at checkout.</p>
          <div className="flex justify-between text-base font-semibold border-t border-line pt-4 mb-6">
            <span>Total</span>
            <span>{formatMoney(resolved.subtotalCents, settings.currency_symbol)}</span>
          </div>

          {resolved.hasUnavailableItems && (
            <p className="text-xs text-error mb-4">
              Remove unavailable items above before proceeding to checkout.
            </p>
          )}
          {resolved.hasPreorderItems && !resolved.hasUnavailableItems && (
            <p className="text-xs text-brass-dark mb-4">
              Your cart includes pre-order item(s) — these are sourced after your order is placed.
            </p>
          )}

          <Link
            to="/checkout"
            className={`btn-primary w-full ${resolved.hasUnavailableItems ? "pointer-events-none opacity-40" : ""}`}
            aria-disabled={resolved.hasUnavailableItems}
          >
            Proceed to Checkout
          </Link>
          <Link to="/shop" className="btn-secondary w-full mt-3">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
