import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeTransaction } from '@/lib/db';
import { ensurePushTableExists } from '@/lib/push-notifications';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKUP_TABLES = [
  'products',
  'product_variants',
  'product_variant_price_logs',
  'customers',
  'distributors',
  'couriers',
  'users',
  'company_settings',
  'sales_orders',
  'so_items',
  'purchase_orders',
  'po_items',
  'stock_batches',
  'invoices',
  'stock_disposals',
  'stock_opname_history',
  'transactions_history',
  'push_subscriptions',
] as const;

/**
 * GET: Export full database snapshot as JSON archive
 */
export async function GET(req: NextRequest) {
  try {
    await ensurePushTableExists();

    const tablesData: Record<string, any[]> = {};
    const tableCounts: Record<string, number> = {};

    for (const table of BACKUP_TABLES) {
      try {
        const rows: any[] = await executeQuery(`SELECT * FROM ${table}`);
        tablesData[table] = rows || [];
        tableCounts[table] = (rows || []).length;
      } catch (err: any) {
        console.warn(`[Backup Warning] Table ${table}:`, err.message);
        tablesData[table] = [];
        tableCounts[table] = 0;
      }
    }

    const backupArchive = {
      app: 'Artaroma Fragrance Hub',
      system_version: '2.0.0',
      schema_version: '2026.08',
      exported_at: new Date().toISOString(),
      record_counts: tableCounts,
      total_records: Object.values(tableCounts).reduce((a, b) => a + b, 0),
      data: tablesData,
    };

    const fileName = `artaroma-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;

    return new NextResponse(JSON.stringify(backupArchive, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Backup export error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal membuat backup database' },
      { status: 500 }
    );
  }
}

/**
 * POST: Restore / Import data from backup JSON payload
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { backupData, mode = 'merge', selectedTables } = body;

    if (!backupData || !backupData.data) {
      return NextResponse.json(
        { success: false, message: 'Format file backup tidak valid. Objek data tidak ditemukan.' },
        { status: 400 }
      );
    }

    const tablesToRestore = Array.isArray(selectedTables) && selectedTables.length > 0
      ? selectedTables
      : Object.keys(backupData.data);

    const restoreSummary: Record<string, { inserted: number; errors: number }> = {};
    let totalRestored = 0;

    await executeTransaction(async (conn) => {
      // If mode is 'replace', truncate or clear selected tables in reverse dependency order
      if (mode === 'replace') {
        const clearOrder = [
          'so_items',
          'po_items',
          'sales_orders',
          'purchase_orders',
          'invoices',
          'stock_disposals',
          'stock_opname_history',
          'transactions_history',
          'product_variant_price_logs',
          'product_variants',
          'products',
          'customers',
          'distributors',
          'couriers',
          'users',
          'push_subscriptions',
        ];

        // Disable foreign key checks during clean replace
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');

        for (const table of clearOrder) {
          if (tablesToRestore.includes(table)) {
            try {
              await conn.query(`TRUNCATE TABLE ${table}`);
            } catch {
              await conn.query(`DELETE FROM ${table}`);
            }
          }
        }

        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      }

      // Restore each table
      for (const table of tablesToRestore) {
        const rows: any[] = backupData.data[table];
        if (!Array.isArray(rows) || rows.length === 0) {
          restoreSummary[table] = { inserted: 0, errors: 0 };
          continue;
        }

        let insertedCount = 0;
        let errorCount = 0;

        for (const row of rows) {
          try {
            const keys = Object.keys(row);
            const values = Object.values(row).map((v) => {
              if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
                return JSON.stringify(v);
              }
              return v;
            });

            const placeholders = keys.map(() => '?').join(', ');
            const updateClause = keys
              .map((k) => `\`${k}\` = VALUES(\`${k}\`)`)
              .join(', ');

            const sql = `
              INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(', ')})
              VALUES (${placeholders})
              ON DUPLICATE KEY UPDATE ${updateClause}
            `;

            await conn.query(sql, values);
            insertedCount++;
          } catch (rowErr: any) {
            console.warn(`[Restore Error in ${table}]:`, rowErr.message);
            errorCount++;
          }
        }

        restoreSummary[table] = { inserted: insertedCount, errors: errorCount };
        totalRestored += insertedCount;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Data backup berhasil dipulihkan (${totalRestored} rekaman berhasil diproses).`,
      mode,
      summary: restoreSummary,
      totalRestored,
    });
  } catch (error: any) {
    console.error('Backup restore error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memulihkan data backup.' },
      { status: 500 }
    );
  }
}
