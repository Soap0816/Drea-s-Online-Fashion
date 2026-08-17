/**
 * Cloudflare bindings available to every route via context.cloudflare.env.
 * Configured in wrangler.toml ([[d1_databases]], [[r2_buckets]], [vars]).
 */
export interface Env {
  DB: D1Database;
  PRODUCT_IMAGES: R2Bucket;
  SITE_URL: string;
  // Secrets — set with `wrangler pages secret put NAME`, never committed:
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  DISCORD_WEBHOOK_URL?: string;
}
