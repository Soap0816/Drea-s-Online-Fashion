# Drea Online Fashion

A production-quality e-commerce site for Drea Online Fashion, built for **Cloudflare Pages**.

> **Status: feature-complete for everything discussed so far** (Parts 1–4:
> catalog, cart/checkout, admin dashboard, oDeliver rates, size/colour
> stock, "Order What You Want", Discord + email notifications, and UI
> polish). What's intentionally left for when you're ready: connecting a
> real card payment processor, and verifying a sending domain with Resend.

## 🔍 Preview it right now — before touching GitHub

Two ways to preview, from fastest to most complete:

1. **`drea-preview.html`** (in this delivery) — a self-contained, static
   visual/interactive mockup of the storefront: browse, pick sizes/colours,
   see in-stock vs. pre-order badges, add to cart, walk through checkout
   with live oDeliver rate calculation, and try the "Order What You Want"
   form. **No install required** — just open the file in any browser.
   It uses placeholder data and doesn't hit a real database or Discord —
   it's for reviewing the look, feel, and flows.

2. **Run the real app locally** — this is the actual, fully working site
   (real database, real cart, real admin) and **does not require GitHub at
   all**:
   ```bash
   npm install
   npm run db:migrate:local
   npm run db:seed:local
   npm run dev
   ```
   Then open `http://localhost:5173`. GitHub only enters the picture later,
   if/when you choose Git-based deployment to Cloudflare Pages (see
   Deploying, below) — local preview is completely independent of it.

## ⚠️ About card payments

This build does **not** collect card numbers, expiry dates, or CVVs
anywhere — not in a form, not in the database, not sent to Discord.
Storing or transmitting that data outside a certified payment processor's
own systems is a serious PCI-DSS compliance and security problem, and
it's not something to build without proper safeguards. Instead:

- Checkout offers **Cash** or **Card** as a payment *preference*.
- If a customer picks Card, they're told you'll follow up with a secure
  payment link once you have a real processor connected (WiPay is
  Trinidad-based and commonly used locally; Stripe is another option).
- When you're ready, that processor's hosted checkout can be wired in as
  a genuine payment method — using real merchant credentials stored as
  secrets, never hard-coded.

## Stack

- **Remix**, running natively on the Cloudflare Workers runtime (no adapter workarounds)
- **Cloudflare D1** (SQLite) for the database
- **Cloudflare R2** for product image storage
- **Tailwind CSS** for styling
- **TypeScript** throughout

## What's included so far

**Catalog & storefront:**
- Home, Shop (search/filter/sort), Product detail pages
- **Size + colour variants** with per-combination stock status: In Stock,
  Pre-Order, or Out of Stock (`product_variants` table) — set from
  a grid in the admin product editor
- R2-backed image route, sitemap.xml, robots.txt, custom 404, Privacy & Terms

**Cart & checkout:**
- Cookie-based cart, no account required — tracks size, colour, and
  whether an item was added as a pre-order
- Checkout collects delivery area (Urban/Rural/Extended/Remote/Tobago) and
  parcel size (Small/Medium), and calculates the **oDeliver delivery fee
  live** from a rate card you control in Settings — matches oDeliver's
  published Standard/Corporate account rates
- **3% cash-on-delivery service charge** applied automatically for
  Standard-account cash orders (waived for Corporate accounts), per
  oDeliver's terms
- Orders and order items written to D1 with a snapshot of product
  name/price/colour/pre-order status
- Order confirmation page, cart cleared automatically after checkout

**"Order What You Want":**
- A dedicated page/tab where customers can request anything from another
  site (Fashion Nova, Amazon, etc.) — description, link, estimated price,
  quantity, plus the same delivery/payment flow as regular checkout
- Stored in its own `custom_orders` table with its own order numbering
  (`DREA-CO-2026-0001`) and admin section

**Notifications:**
- New orders and "Order What You Want" requests post to a **Discord
  webhook** (`DISCORD_WEBHOOK_URL` secret) with customer, items, delivery,
  and total — fails silently so a Discord outage never blocks checkout
- Same notifications also send by **email via Resend** (`RESEND_API_KEY` +
  `RESEND_FROM_EMAIL`) to the address in Settings > Contact Email, if configured

**Polish:**
- Toast notifications (add-to-cart success/error) instead of only inline text
- Slim top-of-page loading bar during navigation
- **Quick View** on shop grid product cards — pick size/colour and add to
  cart without leaving the grid

**Admin dashboard (`/admin`):**
- Secure login (bcrypt + signed session cookie)
- Overview stats, recent orders/products
- Full product CRUD, multi-image upload to R2, reordering
- **Stock & Pre-Order grid** per size/colour combination
- Order management: status changes, internal notes, colour/pre-order/
  delivery-tier/surcharge visible per order
- **Order What You Want** management: status changes, internal notes
- Settings: business info, payment methods, oDeliver account type,
  COD surcharge %, and the full rate card — all editable without touching code

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install Wrangler (Cloudflare's CLI) if you don't have it

```bash
npm install -g wrangler
wrangler login
```

### 3. Create your D1 database

```bash
wrangler d1 create drea_db
```

This prints a `database_id`. Copy it into `wrangler.toml` under `[[d1_databases]]`.

### 4. Create your R2 bucket

```bash
wrangler r2 bucket create drea-product-images
```

### 5. Run migrations and seed data (local dev database)

```bash
npm run db:migrate:local
npm run db:seed:local
```

### 6. Start the dev server

```bash
npm run dev
```

Visit `http://localhost:5173`.

## Deploying to Cloudflare Pages

### 1. Push this repo to GitHub (or GitLab)

### 2. Connect it in the Cloudflare dashboard

Pages → Create a project → Connect to Git → select this repo.
- Build command: `npm run build`
- Build output directory: `build/client`

### 3. Bind D1 and R2 in the Pages project settings

Settings → Functions → add bindings:
- D1 database binding: `DB` → `drea_db`
- R2 bucket binding: `PRODUCT_IMAGES` → `drea-product-images`

(These match `wrangler.toml`, so `wrangler pages deploy` from the CLI will
pick them up automatically too, if you prefer deploying that way instead of
Git integration — see the `deploy` script in `package.json`.)

### 4. Run migrations against the production database

```bash
npm run db:migrate:remote
npm run db:seed:remote   # optional — only if you want the demo products live
```

### 5. Set secrets

```bash
wrangler pages secret put SESSION_SECRET
```

### 6. Connect your domain

Pages → your project → Custom domains → add `dreaonlinefashion.com` (or
whichever domain you own) and follow the DNS instructions shown.

### 7. Updating the site later

Push to your connected Git branch and Cloudflare Pages redeploys
automatically. For database changes, add a new file to `migrations/`
(e.g. `0002_add_something.sql`) and run the migrate commands again —
never edit `0001_initial_schema.sql` after it's been applied to production.

## Project structure

```
app/
  routes/            Remix file-based routes (pages)
  components/         Reusable UI (header, footer, product card, WhatsApp button)
  lib/                D1 queries, types, money formatting, Cloudflare env types
  styles/             Tailwind entry + design tokens
migrations/           D1 schema migrations, applied in order
seed/                 Demo product data
public/               Static assets (placeholder images, favicon)
```

## Design direction

Palette: warm ivory background, deep botanical green as the primary brand
color, warm brass as the accent/CTA color — a boutique feel distinct from
generic template defaults. Display type is Fraunces (serif, editorial);
body type is Public Sans. All tokens live in `tailwind.config.ts` and are
easy to adjust in one place if you want to try a different palette.

## Setting up notifications (Discord + email)

**Discord:**
1. In Discord: Server Settings → Integrations → Webhooks → New Webhook → choose the channel → Copy Webhook URL.
2. Set it as a secret (never put it in code or commit it):
   ```bash
   wrangler pages secret put DISCORD_WEBHOOK_URL
   ```

**Email (optional, via Resend):**
1. Create a account at resend.com and verify a sending domain you own.
2. Set the secrets:
   ```bash
   wrangler pages secret put RESEND_API_KEY
   wrangler pages secret put RESEND_FROM_EMAIL   # e.g. orders@dreaonlinefashion.com
   ```
3. Set **Contact Email** in Settings (`/admin/settings`) to where you want notifications sent.

Both are optional and independent — configure one, both, or neither. Nothing fails if they're unset; you just won't get that channel's notification.

## Database migrations

There are now two migration files, applied in order:
- `0001_initial_schema.sql` — products, orders, settings, admin users
- `0002_odeliver_variants_custom_orders.sql` — colours, size/colour stock
  variants, oDeliver delivery fields, custom orders, sequence counters

Run both with the same commands as before:
```bash
npm run db:migrate:local   # or db:migrate:remote for production
```

## What's next (when you're ready)

- **Real card payments:** wire in WiPay or Stripe's hosted checkout as an
  actual payment method — contained addition since the payment method
  system was built to be swappable from day one.
- **Email domain verification:** Resend requires a verified sending
  domain before it'll deliver — a one-time DNS setup on their dashboard.
- Anything else you'd like added or changed — the codebase is in a stable,
  working state to iterate from.
