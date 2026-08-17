-- Demo/sample products for Drea Online Fashion.
-- These exist so the site isn't empty on first run — the owner can edit
-- or delete every one of them from /admin without touching any code.

INSERT INTO products (name, slug, description, price_cents, category, sizes, featured, new_arrival, availability, sort_order) VALUES
('Floral Ruched Maxi Dress', 'floral-ruched-maxi-dress',
 'A strapless coral floral maxi dress with a ruched bodice and thigh-high slit. Fully lined stretch fabric for a flattering, sculpted fit.',
 22000, 'dresses', '["S","M","L"]', 1, 1, 'available', 10),

('Zebra Print Halter Jumpsuit', 'zebra-print-halter-jumpsuit',
 'Deep-V halter jumpsuit in a bold zebra print with a flared leg and open back. A statement piece for a night out.',
 24000, 'jumpsuits', '["S","M","L","XL"]', 1, 0, 'available', 20),

('Emerald Cut-Out Maxi Dress', 'emerald-cutout-maxi-dress',
 'A sultry emerald green halter maxi dress with a side cut-out and high slit. Soft stretch jersey that moves with you.',
 22000, 'dresses', '["S","M","L"]', 1, 1, 'available', 30),

('Sunset Print Ruched Dress', 'sunset-print-ruched-dress',
 'Orange and green abstract print maxi dress, deep V neckline, ruched through the body with a flowing skirt.',
 22000, 'dresses', '["M","L"]', 0, 0, 'available', 40),

('Tie-Dye Cowl Neck Jumpsuit', 'tie-dye-cowl-neck-jumpsuit',
 'Pink and purple tie-dye jumpsuit with a cowl neckline, halter tie back, and wide flared leg.',
 22000, 'jumpsuits', '["S","M","L"]', 0, 1, 'available', 50),

('Floral Chain-Strap Midi Set', 'floral-chain-strap-midi-set',
 'Pastel floral cowl-neck top with delicate chain straps, paired with a matching high-slit midi skirt.',
 25000, 'sets', '["S","M"]', 1, 0, 'available', 60),

('Abstract Print Long Sleeve Set', 'abstract-print-long-sleeve-set',
 'Brown and cream abstract print long-sleeve top with a plunging neckline, matching fitted midi skirt.',
 28500, 'sets', '["S"]', 0, 0, 'available', 70),

('Teal Ruched Halter Dress', 'teal-ruched-halter-dress',
 'Deep teal halter dress with a plunging neckline and ruched body, cut just above the knee. A versatile evening piece.',
 28500, 'dresses', '["S","M"]', 1, 0, 'available', 80),

('Royal Blue Cut-Out Maxi Dress', 'royal-blue-cutout-maxi-dress',
 'Vivid royal blue halter maxi dress with a draped cut-out detail at the waist and a flowing skirt.',
 28500, 'dresses', '["S"]', 1, 1, 'available', 90),

('Purple Long Sleeve Maxi Dress', 'purple-long-sleeve-maxi-dress',
 'Deep purple long-sleeve maxi dress with a plunging neckline. Sleek and sculpted for an elegant silhouette.',
 24000, 'dresses', '["L"]', 0, 0, 'available', 100),

('Aqua Wash Cross-Strap Jumpsuit', 'aqua-wash-cross-strap-jumpsuit',
 'Sheer aqua wash-print jumpsuit with a cross-strap plunging neckline, open back and flared leg.',
 28000, 'jumpsuits', '["XL"]', 0, 1, 'temporarily_unavailable', 110);

-- Note: no product_images rows are seeded here since real product photography
-- needs to be uploaded by the owner through /admin (Part 3). The shop and
-- product pages render a graceful placeholder until images are uploaded.

-- Demo admin account.
-- Email: owner@dreaonlinefashion.com
-- Password: ChangeThisPassword123!  (bcrypt hash below — CHANGE IMMEDIATELY after first login)
-- See README "Admin Setup" for how to generate a new hash.
INSERT INTO admin_users (email, password_hash, name) VALUES
('owner@dreaonlinefashion.com', '$2a$10$replace.with.a.real.bcrypt.hash.on.setup........', 'Drea');
