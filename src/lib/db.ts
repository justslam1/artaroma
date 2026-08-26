import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Global singleton pattern to prevent connection leaks across Next.js HMR reloads
const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
  schemaMigrated?: boolean;
};

// Create or reuse singleton pool
const pool =
  globalForDb.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fragrance_hub',
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    queueLimit: 0,
    decimalNumbers: true, // Preserve numeric precision for DECIMAL(12,4)
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.mysqlPool = pool;
}

/**
 * Auto-ensure all required columns exist in MySQL schema
 */
export async function ensureSchemaMigrations(force = false): Promise<void> {
  if (globalForDb.schemaMigrated && !force) return;

  try {
    const conn = await pool.getConnection();
    try {
      // 1. Check & Add missing columns in sales_orders
      const [soCols]: any = await conn.query('SHOW COLUMNS FROM sales_orders');
      const soColNames = new Set(soCols.map((c: any) => c.Field.toLowerCase()));

      const soMigrations = [
        { col: 'shipping_type', sql: "ALTER TABLE sales_orders ADD COLUMN shipping_type VARCHAR(20) DEFAULT 'FRANCO'" },
        { col: 'shipping_cost', sql: "ALTER TABLE sales_orders ADD COLUMN shipping_cost DECIMAL(15,2) DEFAULT 0.00" },
        { col: 'total_goods_amount', sql: "ALTER TABLE sales_orders ADD COLUMN total_goods_amount DECIMAL(15,2) DEFAULT 0.00" },
        { col: 'grand_total', sql: "ALTER TABLE sales_orders ADD COLUMN grand_total DECIMAL(15,2) DEFAULT 0.00" },
        { col: 'surat_jalan_number', sql: "ALTER TABLE sales_orders ADD COLUMN surat_jalan_number VARCHAR(100) DEFAULT NULL" },
        { col: 'courier_name', sql: "ALTER TABLE sales_orders ADD COLUMN courier_name VARCHAR(100) DEFAULT NULL" },
        { col: 'delivered_date', sql: "ALTER TABLE sales_orders ADD COLUMN delivered_date DATETIME DEFAULT NULL" },
        { col: 'received_by', sql: "ALTER TABLE sales_orders ADD COLUMN received_by VARCHAR(100) DEFAULT NULL" },
        { col: 'received_photo', sql: "ALTER TABLE sales_orders ADD COLUMN received_photo LONGTEXT DEFAULT NULL" },
        { col: 'received_signature', sql: "ALTER TABLE sales_orders ADD COLUMN received_signature LONGTEXT DEFAULT NULL" },
        { col: 'cancellation_reason', sql: "ALTER TABLE sales_orders ADD COLUMN cancellation_reason TEXT DEFAULT NULL" },
        { col: 'cancelled_at', sql: "ALTER TABLE sales_orders ADD COLUMN cancelled_at VARCHAR(100) DEFAULT NULL" },
        { col: 'cancelled_by', sql: "ALTER TABLE sales_orders ADD COLUMN cancelled_by VARCHAR(100) DEFAULT NULL" },
      ];

      for (const m of soMigrations) {
        if (!soColNames.has(m.col.toLowerCase())) {
          try {
            await conn.query(m.sql);
            console.log(`[Schema Migration] Added column sales_orders.${m.col}`);
          } catch (e: any) {
            console.warn(`[Schema Migration Warning] ${m.col}:`, e.message);
          }
        }
      }

      // 2. Check & Add missing columns in invoices
      try {
        const [invCols]: any = await conn.query('SHOW COLUMNS FROM invoices');
        const invColNames = new Set(invCols.map((c: any) => c.Field.toLowerCase()));

        if (!invColNames.has('shipping_type')) {
          await conn.query("ALTER TABLE invoices ADD COLUMN shipping_type VARCHAR(20) DEFAULT 'FRANCO'");
        }
        if (!invColNames.has('shipping_cost')) {
          await conn.query("ALTER TABLE invoices ADD COLUMN shipping_cost DECIMAL(15,2) DEFAULT 0.00");
        }
      } catch (e: any) {
        console.warn('[Schema Migration Invoices Warning]:', e.message);
      }

      // 2a. Check & Add missing columns in sales_orders (Proof of Delivery, payment proof, cancel metadata)
      try {
        const [soCols]: any = await conn.query('SHOW COLUMNS FROM sales_orders');
        const soColNames = new Set(soCols.map((c: any) => c.Field.toLowerCase()));

        const soMigrations = [
          { col: 'payment_proof_url', sql: 'ALTER TABLE sales_orders ADD COLUMN payment_proof_url LONGTEXT DEFAULT NULL' },
          { col: 'payment_status', sql: "ALTER TABLE sales_orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'UNPAID'" },
          { col: 'received_by', sql: 'ALTER TABLE sales_orders ADD COLUMN received_by VARCHAR(255) DEFAULT NULL' },
          { col: 'received_photo', sql: 'ALTER TABLE sales_orders ADD COLUMN received_photo LONGTEXT DEFAULT NULL' },
          { col: 'received_signature', sql: 'ALTER TABLE sales_orders ADD COLUMN received_signature LONGTEXT DEFAULT NULL' },
          { col: 'surat_jalan_number', sql: 'ALTER TABLE sales_orders ADD COLUMN surat_jalan_number VARCHAR(100) DEFAULT NULL' },
          { col: 'courier_name', sql: 'ALTER TABLE sales_orders ADD COLUMN courier_name VARCHAR(100) DEFAULT NULL' },
          { col: 'delivered_date', sql: 'ALTER TABLE sales_orders ADD COLUMN delivered_date DATETIME DEFAULT NULL' },
          { col: 'cancellation_reason', sql: 'ALTER TABLE sales_orders ADD COLUMN cancellation_reason TEXT DEFAULT NULL' },
          { col: 'cancelled_at', sql: 'ALTER TABLE sales_orders ADD COLUMN cancelled_at DATETIME DEFAULT NULL' },
          { col: 'cancelled_by', sql: 'ALTER TABLE sales_orders ADD COLUMN cancelled_by VARCHAR(100) DEFAULT NULL' },
          { col: 'created_at', sql: 'ALTER TABLE sales_orders ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        ];

        for (const m of soMigrations) {
          if (!soColNames.has(m.col.toLowerCase())) {
            try {
              await conn.query(m.sql);
              console.log(`[Schema Migration] Added column sales_orders.${m.col}`);
            } catch (e: any) {
              console.warn(`[Schema Migration Warning] sales_orders.${m.col}:`, e.message);
            }
          }
        }
      } catch (e: any) {
        console.warn('[Schema Migration Sales Orders Warning]:', e.message);
      }

      // 2b. Check & Add missing columns in customers (PIC 2, PIC 3 & Phone numbers)
      try {
        const [custCols]: any = await conn.query('SHOW COLUMNS FROM customers');
        const custColNames = new Set(custCols.map((c: any) => c.Field.toLowerCase()));

        const custMigrations = [
          { col: 'pic_name_2', sql: "ALTER TABLE customers ADD COLUMN pic_name_2 VARCHAR(100) DEFAULT NULL" },
          { col: 'phone_2', sql: "ALTER TABLE customers ADD COLUMN phone_2 VARCHAR(50) DEFAULT NULL" },
          { col: 'pic_name_3', sql: "ALTER TABLE customers ADD COLUMN pic_name_3 VARCHAR(100) DEFAULT NULL" },
          { col: 'phone_3', sql: "ALTER TABLE customers ADD COLUMN phone_3 VARCHAR(50) DEFAULT NULL" },
          { col: 'default_courier_id', sql: "ALTER TABLE customers ADD COLUMN default_courier_id VARCHAR(64) DEFAULT NULL" },
          { col: 'default_courier_name', sql: "ALTER TABLE customers ADD COLUMN default_courier_name VARCHAR(100) DEFAULT NULL" },
          { col: 'default_shipping_cost', sql: "ALTER TABLE customers ADD COLUMN default_shipping_cost DECIMAL(15,2) DEFAULT 0.00" },
          { col: 'default_shipping_type', sql: "ALTER TABLE customers ADD COLUMN default_shipping_type VARCHAR(20) DEFAULT 'FRANCO'" },
          { col: 'delivery_notes', sql: "ALTER TABLE customers ADD COLUMN delivery_notes TEXT DEFAULT NULL" },
          { col: 'is_active', sql: "ALTER TABLE customers ADD COLUMN is_active TINYINT(1) DEFAULT 1" },
          { col: 'password', sql: "ALTER TABLE customers ADD COLUMN password VARCHAR(255) DEFAULT 'Artaroma2026!'" },
        ];

        for (const m of custMigrations) {
          if (!custColNames.has(m.col.toLowerCase())) {
            try {
              await conn.query(m.sql);
              console.log(`[Schema Migration] Added column customers.${m.col}`);
            } catch (e: any) {
              console.warn(`[Schema Migration Warning] customers.${m.col}:`, e.message);
            }
          }
        }
      } catch (e: any) {
        console.warn('[Schema Migration Customers Warning]:', e.message);
      }

      // 2c. Check & Add missing columns in couriers (Internal vs Eksternal support)
      try {
        const [courCols]: any = await conn.query('SHOW COLUMNS FROM couriers');
        const courColNames = new Set(courCols.map((c: any) => c.Field.toLowerCase()));

        const courMigrations = [
          { col: 'courier_type', sql: "ALTER TABLE couriers ADD COLUMN courier_type VARCHAR(20) DEFAULT 'INTERNAL'" },
          { col: 'service_type', sql: "ALTER TABLE couriers ADD COLUMN service_type VARCHAR(100) DEFAULT NULL" },
          { col: 'notes', sql: "ALTER TABLE couriers ADD COLUMN notes TEXT DEFAULT NULL" },
        ];

        for (const m of courMigrations) {
          if (!courColNames.has(m.col.toLowerCase())) {
            try {
              await conn.query(m.sql);
              console.log(`[Schema Migration] Added column couriers.${m.col}`);
            } catch (e: any) {
              console.warn(`[Schema Migration Warning] couriers.${m.col}:`, e.message);
            }
          }
        }
      } catch (e: any) {
        console.warn('[Schema Migration Couriers Warning]:', e.message);
      }

      // 2d. Check & Add missing currency & payment columns in purchase_orders & po_items
      try {
        const [poCols]: any = await conn.query('SHOW COLUMNS FROM purchase_orders');
        const poColNames = new Set(poCols.map((c: any) => c.Field.toLowerCase()));

        const poMigrations = [
          { col: 'currency', sql: "ALTER TABLE purchase_orders ADD COLUMN currency VARCHAR(10) DEFAULT 'IDR'" },
          { col: 'exchange_rate', sql: "ALTER TABLE purchase_orders ADD COLUMN exchange_rate DECIMAL(15,2) DEFAULT 1.00" },
          { col: 'foreign_total_amount', sql: "ALTER TABLE purchase_orders ADD COLUMN foreign_total_amount DECIMAL(15,2) DEFAULT 0.00" },
          { col: 'paid_amount', sql: "ALTER TABLE purchase_orders ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0.00" },
          { col: 'payment_status', sql: "ALTER TABLE purchase_orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'UNPAID'" },
          { col: 'payment_proof_url', sql: "ALTER TABLE purchase_orders ADD COLUMN payment_proof_url LONGTEXT DEFAULT NULL" },
          { col: 'payment_reference_no', sql: "ALTER TABLE purchase_orders ADD COLUMN payment_reference_no VARCHAR(255) DEFAULT NULL" },
          { col: 'payment_bank_id', sql: "ALTER TABLE purchase_orders ADD COLUMN payment_bank_id VARCHAR(100) DEFAULT NULL" },
          { col: 'payment_bank_name', sql: "ALTER TABLE purchase_orders ADD COLUMN payment_bank_name VARCHAR(255) DEFAULT NULL" },
          { col: 'payment_history', sql: "ALTER TABLE purchase_orders ADD COLUMN payment_history JSON DEFAULT NULL" },
          { col: 'last_payment_date', sql: "ALTER TABLE purchase_orders ADD COLUMN last_payment_date VARCHAR(50) DEFAULT NULL" },
          { col: 'created_at', sql: "ALTER TABLE purchase_orders ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
        ];

        for (const m of poMigrations) {
          if (!poColNames.has(m.col.toLowerCase())) {
            try {
              await conn.query(m.sql);
              console.log(`[Schema Migration] Added column purchase_orders.${m.col}`);
            } catch (e: any) {
              console.warn(`[Schema Migration Warning] purchase_orders.${m.col}:`, e.message);
            }
          }
        }

        const [poiCols]: any = await conn.query('SHOW COLUMNS FROM po_items');
        const poiColNames = new Set(poiCols.map((c: any) => c.Field.toLowerCase()));

        const poiMigrations = [
          { col: 'foreign_cost_per_kg', sql: "ALTER TABLE po_items ADD COLUMN foreign_cost_per_kg DECIMAL(15,2) DEFAULT NULL" },
          { col: 'foreign_subtotal', sql: "ALTER TABLE po_items ADD COLUMN foreign_subtotal DECIMAL(15,2) DEFAULT NULL" },
        ];

        for (const m of poiMigrations) {
          if (!poiColNames.has(m.col.toLowerCase())) {
            try {
              await conn.query(m.sql);
              console.log(`[Schema Migration] Added column po_items.${m.col}`);
            } catch (e: any) {
              console.warn(`[Schema Migration Warning] po_items.${m.col}:`, e.message);
            }
          }
        }
      } catch (e: any) {
        console.warn('[Schema Migration PO Currency Warning]:', e.message);
      }

      // 2e. Check & Add missing columns in products table
      try {
        const [prodCols]: any = await conn.query('SHOW COLUMNS FROM products');
        const prodColNames = new Set(prodCols.map((c: any) => c.Field.toLowerCase()));

        const prodMigrations = [
          { col: 'selling_price_per_kg', sql: "ALTER TABLE products ADD COLUMN selling_price_per_kg DECIMAL(15,2) DEFAULT 0.00" },
          { col: 'selling_price_usd_per_kg', sql: "ALTER TABLE products ADD COLUMN selling_price_usd_per_kg DECIMAL(15,2) DEFAULT 0.00" },
          { col: 'variant_prices', sql: "ALTER TABLE products ADD COLUMN variant_prices LONGTEXT DEFAULT NULL" },
          { col: 'variant_names', sql: "ALTER TABLE products ADD COLUMN variant_names LONGTEXT DEFAULT NULL" },
          { col: 'variant_skus', sql: "ALTER TABLE products ADD COLUMN variant_skus LONGTEXT DEFAULT NULL" },
          { col: 'pack_sizes', sql: "ALTER TABLE products ADD COLUMN pack_sizes LONGTEXT DEFAULT NULL" },
          { col: 'applications', sql: "ALTER TABLE products ADD COLUMN applications LONGTEXT DEFAULT NULL" },
          { col: 'density', sql: "ALTER TABLE products ADD COLUMN density DECIMAL(8,4) DEFAULT 1.0000" },
          { col: 'min_stock_kg', sql: "ALTER TABLE products ADD COLUMN min_stock_kg DECIMAL(10,2) DEFAULT 5.00" },
          { col: 'is_active', sql: "ALTER TABLE products ADD COLUMN is_active TINYINT(1) DEFAULT 1" },
        ];

        for (const m of prodMigrations) {
          if (!prodColNames.has(m.col.toLowerCase())) {
            try {
              await conn.query(m.sql);
              console.log(`[Schema Migration] Added column products.${m.col}`);
            } catch (e: any) {
              console.warn(`[Schema Migration Warning] products.${m.col}:`, e.message);
            }
          }
        }
      } catch (e: any) {
        console.warn('[Schema Migration Products Warning]:', e.message);
      }

      // 2f. Ensure product_variants table exists and has all columns
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS product_variants (
            id VARCHAR(64) PRIMARY KEY,
            product_id VARCHAR(64) NOT NULL,
            variant_sku VARCHAR(64) NOT NULL,
            variant_name VARCHAR(255) NOT NULL,
            pack_size_kg DECIMAL(10,2) NOT NULL,
            selling_price_per_kg DECIMAL(15,2) DEFAULT 0.00,
            selling_price_usd_per_kg DECIMAL(10,2) DEFAULT 0.00,
            min_stock_kg DECIMAL(10,2) DEFAULT 5.00,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        const [pvCols]: any = await conn.query('SHOW COLUMNS FROM product_variants');
        const pvColNames = new Set(pvCols.map((c: any) => c.Field.toLowerCase()));

        const pvMigrations = [
          { col: 'selling_price_per_kg', sql: "ALTER TABLE product_variants ADD COLUMN selling_price_per_kg DECIMAL(15,2) DEFAULT 0.00" },
          { col: 'selling_price_usd_per_kg', sql: "ALTER TABLE product_variants ADD COLUMN selling_price_usd_per_kg DECIMAL(10,2) DEFAULT 0.00" },
          { col: 'min_stock_kg', sql: "ALTER TABLE product_variants ADD COLUMN min_stock_kg DECIMAL(10,2) DEFAULT 5.00" },
          { col: 'is_active', sql: "ALTER TABLE product_variants ADD COLUMN is_active TINYINT(1) DEFAULT 1" },
        ];

        for (const m of pvMigrations) {
          if (!pvColNames.has(m.col.toLowerCase())) {
            try {
              await conn.query(m.sql);
              console.log(`[Schema Migration] Added column product_variants.${m.col}`);
            } catch (e: any) {
              console.warn(`[Schema Migration Warning] product_variants.${m.col}:`, e.message);
            }
          }
        }
      } catch (e: any) {
        console.warn('[Schema Migration Product Variants Warning]:', e.message);
      }

      // 2g. Ensure product_variant_price_logs table exists
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS product_variant_price_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id VARCHAR(50) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            variant_id VARCHAR(50) NOT NULL,
            variant_sku VARCHAR(100) NOT NULL,
            pack_size_kg DECIMAL(10,2) NOT NULL,
            old_price_idr DECIMAL(15,2) NOT NULL,
            new_price_idr DECIMAL(15,2) NOT NULL,
            old_price_usd DECIMAL(15,2) NOT NULL,
            new_price_usd DECIMAL(15,2) NOT NULL,
            changed_by VARCHAR(100) NOT NULL DEFAULT 'Super Admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      } catch (e: any) {
        console.warn('[Schema Migration Price Logs Warning]:', e.message);
      }

      // 3. Ensure operational_logs table exists
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS operational_logs (
            id VARCHAR(50) PRIMARY KEY,
            log_date DATETIME NOT NULL,
            category VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            actor_name VARCHAR(100) NOT NULL,
            actor_role VARCHAR(50),
            reference_id VARCHAR(100),
            document_type VARCHAR(50),
            document_number VARCHAR(100),
            photo_url LONGTEXT,
            signature_url LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } catch (e: any) {
        console.warn('[Schema Migration Logs Warning]:', e.message);
      }

      // 4. Check & Add is_hidden column in users table & ensure Ghost SuperAdmin 'bossanova' exists
      try {
        const [userCols]: any = await conn.query('SHOW COLUMNS FROM users');
        const userColNames = new Set(userCols.map((c: any) => c.Field.toLowerCase()));

        if (!userColNames.has('is_hidden')) {
          await conn.query('ALTER TABLE users ADD COLUMN is_hidden TINYINT(1) DEFAULT 0');
          console.log('[Schema Migration] Added column users.is_hidden');
        }

        if (!userColNames.has('last_login')) {
          await conn.query('ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL');
          console.log('[Schema Migration] Added column users.last_login');
        }

        if (!userColNames.has('notification_preferences')) {
          await conn.query('ALTER TABLE users ADD COLUMN notification_preferences LONGTEXT DEFAULT NULL');
          console.log('[Schema Migration] Added column users.notification_preferences');
        }

        // Check if bossanova account exists
        const [existingBoss]: any = await conn.query(
          "SELECT id FROM users WHERE LOWER(email) = 'boss@artaroma.com' OR LOWER(name) = 'bossanova' LIMIT 1"
        );

        const allAdminModules = JSON.stringify([
          'Dashboard',
          'Master Data',
          'Purchase Order (PO)',
          'Sales Order (SO)',
          'Lihat Stok (Gudang)',
          'Manajemen Kas',
          'Aplikasi Kurir',
          'Katalog Customer',
          'Lihat Nilai Finansial (PO/SO)',
          'Catatan Log Book',
          'Buku Kas Besar (Kas & Bank)',
          'Hutang Piutang',
          'Stock Opname & Disposal',
          'Stok Sampel',
        ]);

        const hashedPassword = await bcrypt.hash('K3maraupanj@ng', 10);

        if (existingBoss && existingBoss.length > 0) {
          await conn.query(
            `UPDATE users 
             SET name = 'bossanova', email = 'boss@artaroma.com', password = ?, role = 'SUPER_ADMIN', linked_entity_name = 'Artaroma Head Office', allowed_modules = ?, is_active = 1, is_hidden = 1 
             WHERE id = ?`,
            [hashedPassword, allAdminModules, existingBoss[0].id]
          );
        } else {
          await conn.query(
            `INSERT INTO users 
             (id, name, email, password, role, linked_entity_name, allowed_modules, is_active, is_hidden)
             VALUES ('usr-bossanova', 'bossanova', 'boss@artaroma.com', ?, 'SUPER_ADMIN', 'Artaroma Head Office', ?, 1, 1)`,
            [hashedPassword, allAdminModules]
          );
          console.log('[Schema Migration] Seeded hidden Super Admin user: bossanova (boss@artaroma.com)');
        }
      } catch (e: any) {
        console.warn('[Schema Migration Users/GhostAdmin Warning]:', e.message);
      }

      globalForDb.schemaMigrated = true;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.warn('[Schema Migration Connection Warning]:', err.message);
  }
}

/**
 * Execute a single SQL query with parameterized inputs to prevent SQL Injection
 */
export async function executeQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<T> {
  try {
    await ensureSchemaMigrations();
    const [results] = await pool.execute(query, params);
    return results as T;
  } catch (error: any) {
    // If unknown column error, retry once after force migration
    if (error.message && error.message.includes('Unknown column')) {
      globalForDb.schemaMigrated = false;
      await ensureSchemaMigrations();
      try {
        const [retryResults] = await pool.execute(query, params);
        return retryResults as T;
      } catch (retryError: any) {
        console.error('Database Query Error after Retry:', retryError.message);
        throw new Error(`DB_QUERY_ERROR: ${retryError.message}`);
      }
    }
    console.error('Database Query Error:', error.message);
    throw new Error(`DB_QUERY_ERROR: ${error.message}`);
  }
}

/**
 * Execute a set of database operations within a manual MySQL transaction
 * Auto-executes START TRANSACTION, COMMIT on success, or ROLLBACK on error.
 */
export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  await ensureSchemaMigrations();
  let connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error: any) {
    await connection.rollback();
    console.error('Transaction Rolled Back:', error.message);

    // If unknown column error, force schema migrations and retry once
    if (error.message && error.message.includes('Unknown column')) {
      connection.release();
      console.log('[executeTransaction] Unknown column detected, forcing schema migration and retrying...');
      globalForDb.schemaMigrated = false;
      await ensureSchemaMigrations(true);

      connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const retryResult = await callback(connection);
        await connection.commit();
        return retryResult;
      } catch (retryError: any) {
        await connection.rollback();
        console.error('Transaction Rolled Back after Retry:', retryError.message);
        throw retryError;
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
