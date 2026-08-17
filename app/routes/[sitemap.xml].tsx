import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/lib/env.server";
import { listShopProducts } from "~/lib/db.server";

/**
 * Sitemap is generated from the live database on every request (cached at
 * the edge by Cache-Control below) so new products the owner adds through
 * /admin appear here automatically — nothing to update by hand.
 */
export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const siteUrl = env.SITE_URL || "https://dreaonlinefashion.com";

  const products = await listShopProducts(env, {});

  const staticUrls = ["", "/shop", "/privacy", "/terms"];

  const urlEntries = [
    ...staticUrls.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`),
    ...products.map((p) => `  <url><loc>${siteUrl}/shop/${p.slug}</loc></url>`),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
