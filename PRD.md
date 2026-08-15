# Product Requirements Document (PRD)

**Nama Proyek:** Artaroma Fragrance Hub — B2B Fragrance Oil Management System  
**Target Platform:** Web Application (Responsive Admin & Customer Portal) & PWA Mobile (Kurir)  
**Dokumen Status:** Final Specification for AntiGravity AI Code Generation  

---

## 1. Executive Summary & Core Goals

### 1.1 Problem Statement
Distribusi grosir bibit parfum (*fragrance oil*) memerlukan kontrol operasional khusus:
* Pelacakan nomor batch, tanggal produksi, dan tanggal kadaluarsa (**FEFO - First Expired, First Out**).
* Penjualan eceran hingga desimal kecil (contoh: 0.1 kg, 0.05 kg, 0.01 kg).
* Pengendalian risiko piutang B2B (Tempo/Kredit) agar tidak melebihi plafon atau menunggak.
* Validasi fisik saat barang diserahterimakan di lokasi customer oleh kurir.

### 1.2 Core Objectives
Menyediakan sistem terpadu yang menghubungkan Admin Gudang, Finance, Customer, dan Kurir untuk memastikan akurasi stok batch, otomatisasi tagihan tempo, dan validasi penerimaan barang secara real-time.

---

## 2. Target User Roles & Scope

| Role | Responsibilities | Scope Access / Action |
| :--- | :--- | :--- |
| **Super Admin / Owner** | Controlling & Financial Overview | Full Access seluruh modul, dashboard finansial, & verifikasi limit kredit. |
| **Warehouse Admin** | Stock Inbound & Outbound | Pembukaan PO, input penerimaan barang (No. Batch & Expiry), alokasi kurir, & Stock Opname. |
| **Finance Admin** | Verification & Invoicing | Verifikasi pembayaran transfer, upload Faktur Pajak PDF, & pemantauan piutang (Aging AR). |
| **B2B Customer** | Self-Service Portal | Katalog produk, pemesanan eceran (Kg), opsi bayar (Lunas/Tempo), upload bukti bayar, download invoice. |
| **Kurir (Courier)** | Verification & Delivery (PWA) | Checklist fisik barang bawaan vs SO, upload foto penerimaan, & ambil Tanda Tangan Digital customer. |

---

## 3. High-Level Architecture & Tech Stack

* **Frontend:** Next.js (App Router) / React dengan Tailwind CSS & Shadcn UI (Responsive & Mobile-Friendly).
* **Backend:** Node.js (TypeScript) / Express.js dengan *database transaction* manual (`START TRANSACTION`).
* **Database:** MySQL 8.0 (Engine: InnoDB) dengan indeks khusus pemotongan FEFO.
* **Storage:** Object Storage (Cloudflare R2 / AWS S3) untuk PDF Invoice, Faktur Pajak, Foto Bukti Transfer, Foto Penerimaan Barang, dan Tanda Tangan Digital.
* **Background Jobs:** BullMQ + Redis untuk antrean kirim email PO & notifikasi jatuh tempo.

---

## 4. Feature Specifications

### Module 1: Procurement & Inbound Inventory (Purchase Order)
* **1.1 Create PO:** Admin memilih distributor, memilih bibit parfum, menginput jumlah order (25 kg, 50 kg, dll.), dan HPP per Kg.
* **1.2 Auto PDF & Mailer:** Sistem me-render PDF Surat Pesanan secara otomatis dan mengirimkannya ke email distributor.
* **1.3 Goods Receipt & Batch Creation:** Saat barang fisik sampai, gudang menginput No. Batch, Tanggal Produksi, dan Expiry Date. Data ini membuat *record* baru pada tabel `stock_batches`.

### Module 2: Inventory & FEFO Engine (Kg Precision)
* **2.1 Batch-Based Stock:** Stok tidak dicatat secara agregat flat, melainkan terikat pada `batch_number` dan `expiry_date`.
* **2.2 High Precision Qty:** Kuantitas menggunakan `DECIMAL(12,4)` untuk mendukung transaksi eceran kecil (0.0100 kg).
* **2.3 Auto-FEFO Deduction:** Saat Sales Order disetujui, backend mengeksekusi query dengan `FOR UPDATE` untuk memotong stok dari batch dengan tanggal kadaluarsa paling dekat.
* **2.4 Expiry & Low Stock Alerts:** Peringatan otomatis untuk stok di bawah `min_stock_kg` atau mendekati kadaluarsa (< 3 bulan).

### Module 3: Customer Portal & B2B Checkout
* **3.1 Product Catalog:** Menampilkan varian bibit parfum, profil aroma (*Top, Middle, Base Notes*), dan harga per Kg.
* **3.2 Order Form:** Form kuantitas presisi Kg dengan preset pilihan cepat (0.01 kg, 0.1 kg, 0.5 kg, 1 kg).
* **3.3 Credit Limit & Overdue Lock:** 
  * Opsi pembayaran: **Lunas (Transfer)** atau **Tempo**.
  * Opsi Tempo **otomatis dikunci** oleh sistem jika `(Total Piutang + Nilai Transaksi) > credit_limit` ATAU customer memiliki transaksi berstatus `OVERDUE`.
* **3.4 Invoice & Tax Invoice Download:** Portal unduh otomatis PDF Invoice dan PDF Faktur Pajak.

### Module 4: Courier PWA & Proof of Delivery (POD)
* **4.1 Delivery Task List:** Kurir melihat daftar alamat dan rincian pesanan yang ditugaskan kepadanya.
* **4.2 Item & Batch Checklist:** Kurir wajib menyentuh checklist verifikasi barang bawaan (mencocokkan nama varian, No. Batch, dan Kg) sebelum tombol serah terima aktif.
* **4.3 Digital Proof of Delivery:** Kurir mengunggah foto penerimaan di lokasi customer dan meminta Tanda Tangan Digital customer via layar *smartphone*.
* **4.4 Delivery Trigger:** Setelah Kurir submit POD, status transaksi berubah menjadi `DELIVERED` dan memicu perhitungan tanggal mulai jatuh tempo (*Due Date*) untuk skema Tempo.

### Module 5: Dashboards & Analytics
* **5.1 Financial Overview:** Total Omset, Margin Keuntungan Kotor (berdasarkan HPP spesifik batch), dan Laporan Piutang (*Aging Receivables* 0-15, 16-30, >30 hari).
* **5.2 Stock & Batch Overview:** Ringkasan sisa stok per batch, indikator kadaluarsa, dan histori mutasi barang.

---

## 5. Complete Database Schema (MySQL 8.0 DDL)

```sql
-- =============================================================================
-- 1. MASTER DATA (Distributors, Customers, Products, Couriers)
-- =============================================================================

CREATE TABLE distributors (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    pic_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address TEXT NOT NULL,
    npwp VARCHAR(30),
    credit_limit DECIMAL(15, 2) DEFAULT 0.00,
    credit_terms_days INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    fragrance_family VARCHAR(50),
    top_notes TEXT,
    middle_notes TEXT,
    base_notes TEXT,
    density DECIMAL(6, 4) DEFAULT 1.0000,
    min_stock_kg DECIMAL(12, 4) DEFAULT 1.0000,
    selling_price_per_kg DECIMAL(15, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE couriers (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    vehicle_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 2. PROCUREMENT & BATCH INVENTORY
-- =============================================================================

CREATE TABLE purchase_orders (
    id VARCHAR(36) PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    distributor_id VARCHAR(36) NOT NULL,
    status VARCHAR(30) DEFAULT 'DRAFT', -- DRAFT, SENT, PARTIALLY_RECEIVED, COMPLETED, CANCELLED
    order_date DATE NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (distributor_id) REFERENCES distributors(id)
);

CREATE TABLE po_items (
    id VARCHAR(36) PRIMARY KEY,
    po_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    qty_ordered_kg DECIMAL(12, 4) NOT NULL,
    cost_per_kg DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE stock_batches (
    id VARCHAR(36) PRIMARY KEY,
    batch_number VARCHAR(50) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    po_item_id VARCHAR(36),
    production_date DATE,
    expiry_date DATE NOT NULL,
    initial_qty_kg DECIMAL(12, 4) NOT NULL,
    current_qty_kg DECIMAL(12, 4) NOT NULL,
    unit_cost_per_kg DECIMAL(15, 2) NOT NULL,
    is_expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_fefo_search (product_id, is_expired, expiry_date, current_qty_kg)
);

-- =============================================================================
-- 3. SALES ORDERS, INVOICING, PAYMENTS & DELIVERIES
-- =============================================================================

CREATE TABLE sales_orders (
    id VARCHAR(36) PRIMARY KEY,
    so_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    courier_id VARCHAR(36) NULL,
    status VARCHAR(30) DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, SHIPPED, DELIVERED, CANCELLED
    payment_method VARCHAR(20) NOT NULL, -- LUNAS_TRANSFER, TEMPO
    total_goods_amount DECIMAL(15, 2) NOT NULL,
    grand_total DECIMAL(15, 2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_date TIMESTAMP NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (courier_id) REFERENCES couriers(id)
);

CREATE TABLE so_items (
    id VARCHAR(36) PRIMARY KEY,
    so_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    qty_kg DECIMAL(12, 4) NOT NULL,
    unit_price_per_kg DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE so_item_batches (
    id VARCHAR(36) PRIMARY KEY,
    so_item_id VARCHAR(36) NOT NULL,
    stock_batch_id VARCHAR(36) NOT NULL,
    qty_taken_kg DECIMAL(12, 4) NOT NULL,
    cogs_per_kg DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (so_item_id) REFERENCES so_items(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_batch_id) REFERENCES stock_batches(id)
);

CREATE TABLE invoices (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    so_id VARCHAR(36) UNIQUE NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'UNPAID', -- UNPAID, PARTIALLY_PAID, PAID, OVERDUE
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    paid_amount DECIMAL(15, 2) DEFAULT 0.00,
    faktur_pajak_file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (so_id) REFERENCES sales_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id VARCHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    proof_of_payment_url TEXT NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE deliveries (
    id VARCHAR(36) PRIMARY KEY,
    so_id VARCHAR(36) UNIQUE NOT NULL,
    courier_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    is_item_verified BOOLEAN DEFAULT FALSE,
    recipient_name VARCHAR(100) NOT NULL,
    received_at TIMESTAMP NULL,
    proof_photo_url TEXT,
    digital_signature_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (so_id) REFERENCES sales_orders(id),
    FOREIGN KEY (courier_id) REFERENCES couriers(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);