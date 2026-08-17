/**
 * Resolves an R2 image key to a public URL served by the /images/* route.
 * This is a pure function with no server-only dependencies (no D1, no env),
 * so it lives outside db.server.ts — it's imported directly by client
 * components (ProductCard, QuickViewModal, etc.), and a .server.ts module
 * can't be bundled into client code.
 */
export function imageUrl(imageKey: string | undefined | null): string {
  if (!imageKey) return "/images/placeholder-product.svg";
  return `/images/${imageKey}`;
}
