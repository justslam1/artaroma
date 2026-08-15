import mysql from 'mysql2/promise';

// Global singleton pattern to prevent connection leaks across Next.js HMR reloads
const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
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
 * Execute a single SQL query with parameterized inputs to prevent SQL Injection
 */
export async function executeQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<T> {
  try {
    const [results] = await pool.execute(query, params);
    return results as T;
  } catch (error: any) {
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
