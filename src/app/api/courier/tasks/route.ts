import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialDeliveryTasks } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courierId = searchParams.get('courier_id') || 'cour-001';

    let tasks = [];
    try {
      tasks = await executeQuery(
        `SELECT 
          so.id AS so_id,
          so.so_number,
          so.courier_id,
          c.pic_name AS customer_name,
          c.company_name,
          c.address AS delivery_address,
          c.phone,
          so.status,
          d.recipient_name,
          d.proof_photo_url,
          d.digital_signature_url,
          d.received_at
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id
        LEFT JOIN deliveries d ON so.id = d.so_id
        WHERE (so.courier_id = ? OR so.courier_id IS NULL)
          AND so.status IN ('APPROVED', 'PROSES_GUDANG', 'DIKIRIM', 'SHIPPED', 'DELIVERED')
        ORDER BY so.order_date DESC`,
        [courierId]
      );

      if (!tasks || tasks.length === 0) {
        tasks = initialDeliveryTasks;
      }
    } catch (e: any) {
      console.warn('Database query courier tasks fallback:', e.message);
      tasks = initialDeliveryTasks;
    }

    return NextResponse.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
