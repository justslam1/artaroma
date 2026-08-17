import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fragrance_hub',
    connectTimeout: 10000,
  };

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(config);

    const [version]: any = await conn.query('SELECT VERSION() as ver');
    const [tables]: any = await conn.query(
      'SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = ?',
      [config.database]
    );
    const [users]: any = await conn.query('SELECT COUNT(*) as total FROM users');

    return NextResponse.json({
      status: 'OK',
      message: 'Koneksi MySQL BERHASIL',
      mysql_version: version[0].ver,
      database: config.database,
      host: config.host,
      total_tables: tables[0].total,
      total_users: users[0].total,
      node_env: process.env.NODE_ENV,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'ERROR',
      message: 'Koneksi MySQL GAGAL',
      error: err.message,
      code: err.code,
      host: config.host,
      user: config.user,
      database: config.database,
    }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
