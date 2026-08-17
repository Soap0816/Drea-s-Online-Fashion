import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/lib/env.server";

/**
 * Serves product images stored in the PRODUCT_IMAGES R2 bucket at
 * /images/<r2-object-key>, e.g. /images/products/floral-maxi-dress/1.jpg
 *
 * Cache-Control is set aggressively since R2 keys are immutable — a
 * changed photo gets a new key rather than overwriting one in place.
 */
export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const key = params["*"];

  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.PRODUCT_IMAGES.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
}
