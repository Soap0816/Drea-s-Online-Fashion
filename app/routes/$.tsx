import { Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => [{ title: "Page Not Found — Drea Online Fashion" }];

export default function NotFound() {
  return (
    <div className="container-page py-28 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="text-3xl sm:text-4xl mb-4">We couldn&apos;t find that page</h1>
      <p className="text-taupe mb-8 max-w-md mx-auto">
        The page you&apos;re looking for may have moved or no longer exists. Let&apos;s get you back to shopping.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link to="/" className="btn-primary">Back to Home</Link>
        <Link to="/shop" className="btn-secondary">Shop All</Link>
      </div>
    </div>
  );
}
