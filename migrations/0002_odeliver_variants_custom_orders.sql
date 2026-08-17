-- Drea Online Fashion — oDeliver rates, product variants (size+colour+stock),
-- and "Order What You Want" custom orders.

-- ============================================================
-- PRODUCTS: add colours (parallel to sizes)
-- ============================================================
ALTER TABLE products ADD COLUMN colours TEXT NOT NULL DEFAULT '[]'; -- JSON array e.g. ["Red","Green"]

-- ============================================================
-- PRODUCT VARIANTS: per size+colour stock status.
-- A row here overrides the product's default availability for that
-- specific size/colour combination. If a product has no variant rows,
-- every size/colour combination falls back to the product's own
-- `availability` field (handled in application code).
-- ============================================================
CREATE TABLE product_variants (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size         TEXT NOT NULL,
  colour       TEXT NOT NULL DEFAULT '',   -- '' when the product has no colour options
  stock_status TEXT NOT NULL DEFAULT 'in_stock'
               CHECK (stock_status IN ('in_stock','preorder','out_of_stock')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, size, colour)
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

-- ============================================================
-- ORDERS: oDeliver-specific fields
-- ============================================================
ALTER TABLE orders ADD COLUMN location_tier TEXT;      -- 'urban' | 'rural' | 'extended' | 'remote' | 'tobago'
ALTER TABLE orders ADD COLUMN shipment_size TEXT;       -- 'small' | 'medium'
ALTER TABLE orders ADD COLUMN cod_surcharge_cents INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- ORDER ITEMS: flag pre-ordered lines and capture colour
-- ============================================================
ALTER TABLE order_items ADD COLUMN selected_colour TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN is_preorder INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- CUSTOM ORDERS ("Order What You Want" — Fashion Nova, Amazon, etc.)
-- ============================================================
CREATE TABLE custom_orders (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number        TEXT NOT NULL UNIQUE,   -- e.g. DREA-CO-2026-0001

  item_description    TEXT NOT NULL,
  item_link           TEXT,                   -- link to the product on the source site
  reference_notes      TEXT,                   -- size/colour/notes the customer typed in
  estimated_budget_cents INTEGER,              -- nullable — customer may not know the price
  quantity             INTEGER NOT NULL DEFAULT 1,

  customer_name  TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT,
  whatsapp       TEXT,

  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('local_delivery','pickup')),
  address         TEXT,
  community_area  TEXT,
  city_town       TEXT,
  delivery_instructions TEXT,
  location_tier   TEXT,
  shipment_size   TEXT,

  payment_method TEXT NOT NULL DEFAULT 'cash',

  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new','reviewing','quoted','awaiting_payment','ordered','shipped','ready','completed','cancelled'
  )),

  internal_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_custom_orders_status ON custom_orders(status);
CREATE INDEX idx_custom_orders_created_at ON custom_orders(created_at);

-- ============================================================
-- GENERAL SEQUENCE COUNTER (replaces order_number_sequence going forward
-- so both regular orders and custom orders get their own clean numbering,
-- e.g. "order-2026" and "custom-2026").
-- ============================================================
CREATE TABLE sequence_counters (
  name        TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- SETTINGS: oDeliver account type + rate card (JSON) + COD surcharge
-- ============================================================
INSERT INTO settings (key, value) VALUES
  ('courier_account_type', 'standard'),          -- 'standard' | 'corporate'
  ('cod_surcharge_percent', '3'),                 -- Standard-account COD service charge; Corporate is 0
  ('delivery_rates_json', '{
    "standard": {
      "urban":    {"small": 3000, "medium": 4500},
      "rural":    {"small": 4000, "medium": 5500},
      "extended": {"small": 5000, "medium": 6500},
      "remote":   {"small": 6000, "medium": 7500},
      "tobago":   {"small": 6000, "medium": 7500}
    },
    "corporate": {
      "urban":    {"small": 3500, "medium": 5000},
      "rural":    {"small": 4500, "medium": 6000},
      "extended": {"small": 5500, "medium": 7000},
      "remote":   {"small": 6500, "medium": 8000},
      "tobago":   {"small": 6500, "medium": 8000}
    }
  }');
-- Rates are stored in cents and match oDeliver''s published Standard/Corporate
-- base rates (Aug 2026). Editable from Settings in /admin — nothing hard-coded
-- into application code.
