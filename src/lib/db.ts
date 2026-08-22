import mysql from 'mysql2/promise';

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
export async function ensureSchemaMigrations(): Promise<void> {
  if (globalForDb.schemaMigrated) return;

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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error: any) {
    await connection.rollback();
    console.error('Transaction Rolled Back:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
