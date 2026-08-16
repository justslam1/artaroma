-- =============================================================================
-- ARTAROMA FRAGRANCE HUB B2B - FULL DATABASE SCHEMA & SEED DATA
-- Target: Hostinger phpMyAdmin (MySQL 8.0+)
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABEL USERS (Autentikasi Pegawai & Admin)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('SUPER ADMIN', 'SALES', 'FINANCE', 'GUDANG', 'KURIR', 'CUSTOMER') NOT NULL,
    phone VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL COMPANY SETTINGS (Profil Perusahaan, Tagline, & Rekening Bank)
CREATE TABLE IF NOT EXISTS company_settings (
    id VARCHAR(64) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_tagline VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    email VARCHAR(128),
    address TEXT,
    bank_accounts JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL DISTRIBUTORS (Vendor / Supplier Bibit Parfum)
CREATE TABLE IF NOT EXISTS distributors (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(128),
    phone VARCHAR(64),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL COURIERS (Kurir & Armada Ekspedisi Internal)
CREATE TABLE IF NOT EXISTS couriers (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    vehicle_number VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL CUSTOMERS (Mitra Bisnis B2B & Customer)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    username VARCHAR(64),
    password VARCHAR(255),
    company_name VARCHAR(255) NOT NULL,
    pic_name VARCHAR(255) NOT NULL,
    email VARCHAR(128) NOT NULL,
    phone VARCHAR(64),
    address TEXT,
    npwp VARCHAR(64),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    credit_terms_days INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL PRODUCTS (Master Produk Induk)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    applications JSON,
    fragrance_family VARCHAR(128),
    top_notes TEXT,
    middle_notes TEXT,
    base_notes TEXT,
    density DECIMAL(8,4) DEFAULT 1.0000,
    min_stock_kg DECIMAL(10,2) DEFAULT 5.00,
    selling_price_per_kg DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL PRODUCT VARIANTS (Varian Kemasan 25K, 5K, 1K)
CREATE TABLE IF NOT EXISTS product_variants (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL,
    variant_sku VARCHAR(64) UNIQUE NOT NULL,
    variant_name VARCHAR(255) NOT NULL,
    pack_size_kg DECIMAL(10,2) NOT NULL,
    selling_price_per_kg DECIMAL(15,2) NOT NULL,
    selling_price_usd_per_kg DECIMAL(10,2) DEFAULT 0.00,
    min_stock_kg DECIMAL(10,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABEL STOCK BATCHES (Manajemen Batch / FEFO Engine)
CREATE TABLE IF NOT EXISTS stock_batches (
    id VARCHAR(64) PRIMARY KEY,
    batch_number VARCHAR(64) UNIQUE NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    po_item_id VARCHAR(64),
    production_date DATE,
    expiry_date DATE NOT NULL,
    initial_qty_kg DECIMAL(12,4) NOT NULL,
    current_qty_kg DECIMAL(12,4) NOT NULL,
    unit_cost_per_kg DECIMAL(15,2) NOT NULL,
    is_expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABEL SALES ORDERS (SO B2B)
CREATE TABLE IF NOT EXISTS sales_orders (
    id VARCHAR(64) PRIMARY KEY,
    so_number VARCHAR(64) UNIQUE NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    customer_name VARCHAR(255),
    customer_company VARCHAR(255),
    courier_id VARCHAR(64),
    courier_name VARCHAR(255),
    surat_jalan_number VARCHAR(64),
    status ENUM('DIAJUKAN', 'PENDING_APPROVAL', 'DIKONFIRMASI', 'PROSES_GUDANG', 'DIKIRIM', 'DITERIMA', 'SELESAI', 'BATAL', 'CANCELLED') DEFAULT 'DIAJUKAN',
    payment_method ENUM('LUNAS_TRANSFER', 'TEMPO', 'TUNAI', 'KREDIT') DEFAULT 'LUNAS_TRANSFER',
    total_goods_amount DECIMAL(15,2) DEFAULT 0.00,
    grand_total DECIMAL(15,2) DEFAULT 0.00,
    order_date DATE,
    delivered_date DATE,
    invoice_id VARCHAR(64),
    received_by VARCHAR(255),
    received_photo LONGTEXT,
    received_signature LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABEL SO ITEMS (Item Detail Pesanan)
CREATE TABLE IF NOT EXISTS so_items (
    id VARCHAR(64) PRIMARY KEY,
    so_id VARCHAR(64) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    product_name VARCHAR(255),
    original_qty_kg DECIMAL(10,2),
    qty_kg DECIMAL(10,2) NOT NULL,
    unit_price_per_kg DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABEL SO ITEM BATCHES (Alokasi Batch FEFO per Item)
CREATE TABLE IF NOT EXISTS so_item_batches (
    id VARCHAR(64) PRIMARY KEY,
    so_item_id VARCHAR(64) NOT NULL,
    batch_number VARCHAR(64) NOT NULL,
    qty_taken_kg DECIMAL(12,4) NOT NULL,
    FOREIGN KEY (so_item_id) REFERENCES so_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABEL INVOICES (Faktur Penjualan & Piutang)
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    so_id VARCHAR(64),
    so_number VARCHAR(64),
    customer_id VARCHAR(64),
    customer_name VARCHAR(255),
    status ENUM('UNPAID', 'PAID', 'OVERDUE') DEFAULT 'UNPAID',
    issue_date DATE,
    due_date DATE,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    payment_proof_url LONGTEXT,
    payment_verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
    faktur_pajak_file_url LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. TABEL LOG REPACKAGE & PRICE LOGS
CREATE TABLE IF NOT EXISTS product_variant_price_logs (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL,
    variant_id VARCHAR(64) NOT NULL,
    old_price DECIMAL(15,2) NOT NULL,
    new_price DECIMAL(15,2) NOT NULL,
    changed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_repackage_logs (
    id VARCHAR(64) PRIMARY KEY,
    source_batch_id VARCHAR(64) NOT NULL,
    target_product_id VARCHAR(64) NOT NULL,
    target_variant_name VARCHAR(255) NOT NULL,
    qty_taken_kg DECIMAL(10,2) NOT NULL,
    pack_size_kg DECIMAL(10,2) NOT NULL,
    total_packs_produced INT NOT NULL,
    created_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SEED DATA AWAL (Data Inisialisasi)
-- =============================================================================

-- 1. SEED AKUN USER (Password: Artaroma2026! & sales123)
INSERT INTO users (id, name, email, password, role, is_active)
VALUES 
('usr-admin', 'Super Admin HQ', 'admin@artaroma.co.id', '$2a$10$w85oF3qDlGZ1m0jC5qEreOL.eFvE3JqVn5Zk7eK9v0Y/L4z8x0pCe', 'SUPER ADMIN', TRUE),
('usr-sales', 'Rangga Sales Executive', 'sales@artaroma.com', '$2a$10$w85oF3qDlGZ1m0jC5qEreOL.eFvE3JqVn5Zk7eK9v0Y/L4z8x0pCe', 'SALES', TRUE),
('usr-finance', 'Siti Finance Admin', 'finance@artaroma.com', '$2a$10$w85oF3qDlGZ1m0jC5qEreOL.eFvE3JqVn5Zk7eK9v0Y/L4z8x0pCe', 'FINANCE', TRUE),
('usr-gudang', 'Bagus Pengelola Gudang', 'gudang@artaroma.com', '$2a$10$w85oF3qDlGZ1m0jC5qEreOL.eFvE3JqVn5Zk7eK9v0Y/L4z8x0pCe', 'GUDANG', TRUE),
('usr-kurir', 'Agus Kurir Armada', 'agus@artaroma.co.id', '$2a$10$w85oF3qDlGZ1m0jC5qEreOL.eFvE3JqVn5Zk7eK9v0Y/L4z8x0pCe', 'KURIR', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. SEED COMPANY SETTINGS
INSERT INTO company_settings (id, company_name, company_tagline, phone, email, address, bank_accounts)
VALUES (
    'comp-001',
    'PT Artaroma Jayatama',
    'B2B Fragrance Oil Supplier & Management Hub',
    '021-5890-1234',
    'info@artaroma.co.id',
    'Kawasan Industri MM2100 Blok C-3, Cikarang Barat, Bekasi 17530',
    '[{"bank":"BCA","no":"8830-1928-33","atas_nama":"PT ARTAROMA JAYATAMA","jenis":"Rekening Utama (Otomatis)"},{"bank":"MANDIRI","no":"120-00-998877-1","atas_nama":"PT ARTAROMA JAYATAMA","jenis":"Rekening Operasional"}]'
)
ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), company_tagline=VALUES(company_tagline);

-- 3. SEED DISTRIBUTOR & KURIR
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
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO couriers (id, code, name, phone, vehicle_number, is_active)
VALUES (
    'cour-001',
    'KUR-001',
    'Agus Kurir Armada (Blind Van)',
    '0813-8899-7711',
    'B 7721 KFP (Blind Van)',
    TRUE
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 4. SEED CUSTOMERS
INSERT INTO customers (id, code, username, password, company_name, pic_name, email, phone, address, npwp, credit_limit, credit_terms_days, is_active)
VALUES 
(
    'cust-001',
    'CUST-001',
    'budi',
    '$2a$10$w85oF3qDlGZ1m0jC5qEreOL.eFvE3JqVn5Zk7eK9v0Y/L4z8x0pCe',
    'PT Parfumerie Indah Nusantara',
    'Budi Santoso',
    'budi@parfumerieindah.com',
    '0812-9988-7766',
    'Kawasan Industri Jababeka V Blok C-12, Cikarang, Bekasi',
    '01.345.678.9-012.000',
    50000000.00,
    30,
    TRUE
),
(
    'cust-002',
    'CUST-002',
    'dewi',
    '$2a$10$w85oF3qDlGZ1m0jC5qEreOL.eFvE3JqVn5Zk7eK9v0Y/L4z8x0pCe',
    'CV Aroma Botanica Indonesia',
    'Dewi Sastro',
    'dewi@aromabotanica.co.id',
    '0856-1122-3344',
    'Jl. Raya Bogor KM 28 No. 45, Ciracas, Jakarta Timur',
    '02.987.654.3-045.000',
    0.00,
    0,
    TRUE
)
ON DUPLICATE KEY UPDATE company_name=VALUES(company_name);

-- 5. SEED PRODUCTS
INSERT INTO products (id, sku, name, applications, fragrance_family, top_notes, middle_notes, base_notes, density, min_stock_kg, selling_price_per_kg, is_active)
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
    25.00,
    1850000.00,
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
    25.00,
    1450000.00,
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
    25.00,
    4200000.00,
    TRUE
)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 6. SEED PRODUCT VARIANTS
INSERT INTO product_variants (id, product_id, variant_sku, variant_name, pack_size_kg, selling_price_per_kg, selling_price_usd_per_kg, min_stock_kg, is_active)
VALUES 
('var-van-25k', 'prod-001', 'FO-VAN-001-25K', 'Vanilla Bourbon Super Pure 25K', 25.00, 3850000.00, 236.92, 25.00, TRUE),
('var-van-5k',  'prod-001', 'FO-VAN-001-5K',  'Vanilla Bourbon Super Pure 5K',  5.00,  1850000.00, 113.85, 5.00,  TRUE),
('var-van-1k',  'prod-001', 'FO-VAN-001-1K',  'Vanilla Bourbon Super Pure 1K',  1.00,  1850000.00, 113.85, 1.00,  TRUE),

('var-lav-25k', 'prod-002', 'FO-LAV-002-25K', 'Lavender Provençal Premium 25K', 25.00, 1450000.00, 89.23,  25.00, TRUE),
('var-lav-5k',  'prod-002', 'FO-LAV-002-5K',  'Lavender Provençal Premium 5K',  5.00,  1450000.00, 89.23,  5.00,  TRUE),
('var-lav-1k',  'prod-002', 'FO-LAV-002-1K',  'Lavender Provençal Premium 1K',  1.00,  1450000.00, 89.23,  1.00,  TRUE),

('var-oud-25k', 'prod-003', 'FO-OUD-003-25K', 'Oud Royale Intense (Agarwood) 25K', 25.00, 4200000.00, 258.46, 25.00, TRUE),
('var-oud-5k',  'prod-003', 'FO-OUD-003-5K',  'Oud Royale Intense (Agarwood) 5K',  5.00,  4200000.00, 258.46, 5.00,  TRUE),
('var-oud-1k',  'prod-003', 'FO-OUD-003-1K',  'Oud Royale Intense (Agarwood) 1K',  1.00,  4200000.00, 258.46, 1.00,  TRUE)
ON DUPLICATE KEY UPDATE selling_price_per_kg=VALUES(selling_price_per_kg);

-- 7. SEED INITIAL STOCK BATCHES
INSERT INTO stock_batches (id, batch_number, product_id, po_item_id, production_date, expiry_date, initial_qty_kg, current_qty_kg, unit_cost_per_kg, is_expired)
VALUES 
('batch-001', 'LOT-2026-A1', 'prod-001', NULL, '2025-09-01', '2026-09-01', 75.00, 50.00, 1250000.00, FALSE),
('batch-002', 'LOT-2026-B2', 'prod-002', NULL, '2026-01-15', '2027-01-15', 50.00, 50.00, 980000.00,  FALSE),
('batch-003', 'LOT-2026-C3', 'prod-003', NULL, '2026-02-01', '2027-08-01', 50.00, 50.00, 3100000.00, FALSE)
ON DUPLICATE KEY UPDATE current_qty_kg=VALUES(current_qty_kg);

SET FOREIGN_KEY_CHECKS = 1;
