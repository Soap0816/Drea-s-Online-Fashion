import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/lib/env.server";

export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const siteUrl = env.SITE_URL || "https://dreaonlinefashion.com";

  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /cart
Disallow: /checkout

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
