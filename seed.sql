-- =============================================================================
-- ARTAROMA FRAGRANCE HUB B2B - SEED DATA (seed.sql)
-- =============================================================================

USE fragrance_hub;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. SEED DISTRIBUTOR
INSERT INTO distributors (id, code, name, contact_name, email, phone, address)
VALUES (
    'dist-001',
    'DIST-GIV-01',
    'PT Givaudan Indonesia (Vendor)',
    'Hendra Gunawan (Key Account)',
    'order.id@givaudan.com',
    '021-8971-2233',
    'Kawasan Industri MM2100 Blok B1-2, Cikarang Barat, Bekasi'
)
ON DUPLICATE KEY UPDATE name=VALUES(name), contact_name=VALUES(contact_name);

-- 2. SEED COURIER
INSERT INTO couriers (id, code, name, phone, vehicle_number, is_active)
VALUES (
    'cour-001',
    'KUR-001',
    'Budi Gunawan (Kurir Cargo)',
    '0813-8899-7711',
    'B 7721 KFP (Blind Van)',
    TRUE
)
ON DUPLICATE KEY UPDATE name=VALUES(name), vehicle_number=VALUES(vehicle_number);

-- 3. SEED PRODUK INDUK (Master Products)
INSERT INTO products (id, sku, name, applications, fragrance_family, top_notes, middle_notes, base_notes, density, is_active)
VALUES 
(
    'prod-001',
    'FO-VAN-001',
    'Vanilla Bourbon Super Pure',
    '["Fine Fragrance", "Industry"]',
    'Gourmand',
    'Creamy Milk, Sweet Almond',
    'Madagascar Vanilla Pod, Caramel',
    'Tonka Bean, Sandalwood, Musk',
    1.0250,
    TRUE
),
(
    'prod-002',
    'FO-LAV-002',
    'Lavender Provençal Premium',
    '["Fine Fragrance"]',
    'Floral',
    'French Lavender, Bergamot, Clary Sage',
    'Lavandin, Rosemary, Blue Camomile',
    'White Cedar, Patchouli, Oakmoss',
    0.9850,
    TRUE
),
(
    'prod-003',
    'FO-OUD-003',
    'Oud Royale Intense (Agarwood)',
    '["Fine Fragrance", "Industry"]',
    'Woody',
    'Saffron, Cardamom, Rose',
    'Agarwood (Oud), Leather, Cypress',
    'Amber, Smoked Incense, Vetiver, Musk',
    1.0500,
    TRUE
),
(
    'prod-009',
    'FO-NEW-009',
    'aman jiwa',
    '["Industry", "Fine Fragrance"]',
    'Fine Fragrance',
    'Bergamot, Pink Pepper',
    'Rose, Jasmine Sambac',
    'Amber, Cedarwood, Musk',
    1.0000,
    TRUE
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 4. SEED PRODUK VARIAN (Product Variants Hierarchy)
INSERT INTO product_variants (id, product_id, variant_sku, variant_name, pack_size_kg, selling_price_per_kg, selling_price_usd_per_kg, min_stock_kg, is_active)
VALUES 
('var-van-25k', 'prod-001', 'FO-VAN-001-25K', 'Vanilla Bourbon Super Pure 25K', 25.0000, 3850000.00, 236.92, 25.0000, TRUE),
('var-van-5k',  'prod-001', 'FO-VAN-001-5K',  'Vanilla Bourbon Super Pure 5K',  5.0000,  1850000.00, 113.85, 5.0000,  TRUE),
('var-van-1k',  'prod-001', 'FO-VAN-001-1K',  'Vanilla Bourbon Super Pure 1K',  1.0000,  1850000.00, 113.85, 1.0000,  TRUE),

('var-lav-25k', 'prod-002', 'FO-LAV-002-25K', 'Lavender Provençal Premium 25K', 25.0000, 1450000.00, 89.23,  25.0000, TRUE),
('var-lav-5k',  'prod-002', 'FO-LAV-002-5K',  'Lavender Provençal Premium 5K',  5.0000,  1450000.00, 89.23,  5.0000,  TRUE),
('var-lav-1k',  'prod-002', 'FO-LAV-002-1K',  'Lavender Provençal Premium 1K',  1.0000,  1450000.00, 89.23,  1.0000,  TRUE),

('var-oud-25k', 'prod-003', 'FO-OUD-003-25K', 'Oud Royale Intense (Agarwood) 25K', 25.0000, 4200000.00, 258.46, 25.0000, TRUE),
('var-oud-5k',  'prod-003', 'FO-OUD-003-5K',  'Oud Royale Intense (Agarwood) 5K',  5.0000,  4200000.00, 258.46, 5.0000,  TRUE),
('var-oud-1k',  'prod-003', 'FO-OUD-003-1K',  'Oud Royale Intense (Agarwood) 1K',  1.0000,  4200000.00, 258.46, 1.0000,  TRUE),

('var-new-5k',  'prod-009', 'FO-NEW-009-5K',  'aman jiwa 5K', 5.0000, 3000000.00, 184.62, 5.0000, TRUE),
('var-new-1k',  'prod-009', 'FO-NEW-009-1K',  'aman jiwa 1K', 1.0000, 1150000.00, 70.77,  1.0000, TRUE)
ON DUPLICATE KEY UPDATE selling_price_per_kg=VALUES(selling_price_per_kg), min_stock_kg=VALUES(min_stock_kg);

SET FOREIGN_KEY_CHECKS = 1;
