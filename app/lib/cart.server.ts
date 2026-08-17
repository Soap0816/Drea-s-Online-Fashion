import { createCookie } from "@remix-run/cloudflare";

/**
 * The cart lives in a signed-free, httpOnly cookie rather than a database
 * row — there's no customer account system, so a cookie is the right
 * amount of complexity. It's read/written only from server-side actions;
 * pages never need direct JS access to it.
 */
export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  size: string;
  colour: string; // '' when the product has no colour options
  quantity: number;
  /** Price at the moment it was added — display only. Checkout always
   *  re-reads the current price from the database before charging. */
  priceCentsAtAdd: number;
  imageKey: string | null;
  /** True if this size/colour was pre-order stock when added to cart. */
  isPreorder: boolean;
}

const cartCookie = createCookie("drea_cart", {
  maxAge: 60 * 60 * 24 * 30, // 30 days
  httpOnly: true,
  sameSite: "lax",
  path: "/",
});

export async function getCart(request: Request): Promise<CartItem[]> {
  const value = await cartCookie.parse(request.headers.get("Cookie"));
  return Array.isArray(value) ? value : [];
}

export async function serializeCart(items: CartItem[]): Promise<string> {
  return cartCookie.serialize(items);
}

export function cartItemKey(productId: number, size: string, colour: string): string {
  return `${productId}::${size}::${colour}`;
}

export function addToCart(cart: CartItem[], newItem: CartItem): CartItem[] {
  const key = cartItemKey(newItem.productId, newItem.size, newItem.colour);
  const existing = cart.find((i) => cartItemKey(i.productId, i.size, i.colour) === key);
  if (existing) {
    return cart.map((i) =>
      cartItemKey(i.productId, i.size, i.colour) === key ? { ...i, quantity: i.quantity + newItem.quantity } : i
    );
  }
  return [...cart, newItem];
}

export function updateCartQuantity(cart: CartItem[], productId: number, size: string, colour: string, quantity: number): CartItem[] {
  const key = cartItemKey(productId, size, colour);
  if (quantity <= 0) {
    return cart.filter((i) => cartItemKey(i.productId, i.size, i.colour) !== key);
  }
  return cart.map((i) => (cartItemKey(i.productId, i.size, i.colour) === key ? { ...i, quantity } : i));
}

export function removeFromCart(cart: CartItem[], productId: number, size: string, colour: string): CartItem[] {
  const key = cartItemKey(productId, size, colour);
  return cart.filter((i) => cartItemKey(i.productId, i.size, i.colour) !== key);
}

export function cartItemCount(cart: CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.quantity, 0);
}
