import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyApiAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Lihat Stok (Gudang)']);
  if (auth.error) return auth.error;

  try {
    let history: any[] = [];
    try {
      history = await executeQuery(`
        SELECT h.*, p.name AS product_name 
        FROM stock_opname_history h 
        LEFT JOIN products p ON h.product_id = p.id 
        ORDER BY h.created_at DESC
      `);
    } catch (e: any) {
      console.warn('Failed to fetch stock opname history from database:', e.message);
      history = []; // Fallback to empty list
    }

    return NextResponse.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
