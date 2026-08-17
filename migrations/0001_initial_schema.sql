-- Drea Online Fashion — Initial Schema
-- Cloudflare D1 (SQLite)

-- ============================================================
-- SETTINGS: single-row-per-key config the owner can edit in /admin
-- ============================================================
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('business_name', 'Drea Online Fashion'),
  ('instagram_handle', 'drea_online_fashion'),
  ('whatsapp_number', ''),                         -- e.g. 18681234567 (owner sets in admin)
  ('contact_email', ''),
  ('business_description', 'Style made for you. Discover your next favorite look.'),
  ('checkout_notice', 'Please note: some items are sourced after an order is placed. Availability will be confirmed after your order is received.'),
  ('delivery_fee_default', '0'),                   -- stored in TT cents
  ('delivery_fee_pickup', '0'),
  ('payment_methods_enabled', 'cash,bank_transfer'), -- comma list; "card" added later once a processor is integrated
  ('currency_code', 'TTD'),
  ('currency_symbol', 'TT$');

-- ============================================================
-- ADMIN USERS
-- ============================================================
CREATE TABLE admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- bcrypt hash, never plaintext
  name          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  price_cents  INTEGER NOT NULL,          -- store money as integer cents (TTD)
  category     TEXT NOT NULL,             -- 'dresses' | 'jumpsuits' | 'sets' | 'tops' | 'bottoms' | ...
  sizes        TEXT NOT NULL DEFAULT '[]',-- JSON array e.g. ["S","M","L","XL"]
  featured     INTEGER NOT NULL DEFAULT 0,-- 0/1
  new_arrival  INTEGER NOT NULL DEFAULT 0,-- 0/1
  -- Availability reflects the "order first, source later" business model —
  -- NOT a stock quantity.
  availability TEXT NOT NULL DEFAULT 'available'
               CHECK (availability IN ('available','temporarily_unavailable','discontinued')),
  hidden       INTEGER NOT NULL DEFAULT 0,-- 0/1, owner can hide without deleting
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_products_new_arrival ON products(new_arrival);
CREATE INDEX idx_products_hidden ON products(hidden);

-- ============================================================
-- PRODUCT IMAGES (multiple per product, ordered)
-- ============================================================
CREATE TABLE product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- R2 object key, e.g. "products/floral-ruched-maxi-dress/1.jpg"
  image_key  TEXT NOT NULL,
  alt_text   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number   TEXT NOT NULL UNIQUE,   -- e.g. DREA-2026-0001

  -- Customer info
  customer_name  TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT,
  whatsapp       TEXT,

  -- Delivery info
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('local_delivery','pickup')),
  address         TEXT,
  community_area  TEXT,
  city_town        TEXT,
  delivery_instructions TEXT,

  -- Money (integer cents, TTD)
  subtotal_cents      INTEGER NOT NULL,
  delivery_fee_cents  INTEGER NOT NULL DEFAULT 0,
  total_cents         INTEGER NOT NULL,

  payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash' | 'bank_transfer' | 'card' (future)

  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new','reviewing','availability_confirmed','awaiting_payment',
    'processing','ready','out_for_delivery','completed','cancelled'
  )),

  customer_notes TEXT,   -- notes left by the customer at checkout
  internal_notes TEXT,   -- private notes the owner adds in /admin

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- ============================================================
-- ORDER ITEMS
-- Snapshots product name/price at time of order, since products
-- can change (or be removed) after the order was placed.
-- ============================================================
CREATE TABLE order_items (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id              INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id            INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  selected_size         TEXT NOT NULL,
  quantity              INTEGER NOT NULL DEFAULT 1,
  price_snapshot_cents  INTEGER NOT NULL
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- ORDER NUMBER SEQUENCE HELPER
-- Tracks the next sequence number per year so order numbers are
-- gapless-ish and human readable: DREA-2026-0001
-- ============================================================
CREATE TABLE order_number_sequence (
  year        INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);
