import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialDeliveryTasks } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courierId = searchParams.get('courier_id');
    const courierName = searchParams.get('courier_name') || '';

    let tasks: any[] = [];
    try {
      // Query sales orders matching this courier (or general deliverable orders if courier filter is wide)
      let query = `
        SELECT 
          so.id AS so_id,
          so.id AS id,
          so.so_number,
          so.surat_jalan_number,
          so.courier_id,
          so.courier_name,
          so.customer_id,
          c.pic_name AS customer_name,
          c.company_name,
          c.address AS delivery_address,
          c.phone,
          so.status,
          so.received_by AS recipient_name,
          so.received_photo AS proof_photo_url,
          so.received_signature AS digital_signature_url,
          so.delivered_date AS received_at,
          d.recipient_name AS deliv_recipient_name,
          d.proof_photo_url AS deliv_proof_photo,
          d.digital_signature_url AS deliv_signature,
          d.received_at AS deliv_received_at
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN deliveries d ON so.id = d.so_id
        WHERE so.status IN ('DIKIRIM', 'PROSES_GUDANG', 'DITERIMA', 'DELIVERED')
      `;
      const queryParams: any[] = [];

      if (courierName || courierId) {
        query += ` AND (
          so.courier_id = ? 
          OR so.courier_name LIKE ? 
          OR so.courier_name LIKE ? 
          OR so.courier_id IS NULL
        )`;
        const firstName = courierName.split(' ')[0] || '';
        queryParams.push(courierId || '', `%${courierName}%`, `%${firstName}%`);
      }

      query += ' ORDER BY CASE WHEN so.status = \'DIKIRIM\' THEN 1 WHEN so.status = \'PROSES_GUDANG\' THEN 2 ELSE 3 END, so.order_date DESC';

      const rows: any[] = await executeQuery(query, queryParams);

      if (rows && rows.length > 0) {
        // Fetch items and assigned batches for each task
        for (const r of rows) {
          const soItems: any[] = await executeQuery(
            'SELECT * FROM so_items WHERE so_id = ?',
            [r.so_id]
          );

          const formattedItems = [];
          if (soItems && soItems.length > 0) {
            for (const item of soItems) {
              const assignedBatches: any[] = await executeQuery(
                `SELECT sb.batch_number, sib.qty_taken_kg 
                 FROM so_item_batches sib 
                 JOIN stock_batches sb ON sib.stock_batch_id = sb.id 
                 WHERE sib.so_item_id = ?`,
                [item.id]
              );

              const batchNumber = assignedBatches.map((b) => b.batch_number).join(', ') || 'LOT-2026-FEFO';
              const isDelivered = r.status === 'DITERIMA' || r.status === 'DELIVERED';

              formattedItems.push({
                product_id: item.product_id,
                product_name: item.product_name || 'Varian Bibit Parfum',
                pack_size_kg: parseFloat(item.qty_kg) || 25,
                unit_count: 1,
                batch_number: batchNumber,
                verified: isDelivered, // Auto-verified if already delivered
              });
            }
          }

          const isDelivered = r.status === 'DITERIMA' || r.status === 'DELIVERED';
          tasks.push({
            id: r.id || `task-${r.so_id}`,
            so_id: r.so_id,
            so_number: r.so_number,
            surat_jalan_number: r.surat_jalan_number || `SJ-${r.so_number}`,
            customer_id: r.customer_id,
            customer_name: r.customer_name || 'PIC Customer',
            company_name: r.company_name || 'Customer B2B Artaroma',
            delivery_address: r.delivery_address || 'Jl. Raya Industri Fragrance, Jakarta',
            phone: r.phone || '0812-3456-7890',
            status: isDelivered ? 'DELIVERED' : (r.status === 'DIKIRIM' ? 'IN_TRANSIT' : 'PENDING'),
            recipient_name: r.recipient_name || r.deliv_recipient_name || '',
            proof_photo_url: r.proof_photo_url || r.deliv_proof_photo || '',
            digital_signature_url: r.digital_signature_url || r.deliv_signature || '',
            delivered_at: r.received_at || r.deliv_received_at || '',
            items: formattedItems.length > 0 ? formattedItems : [
              {
                product_id: 'prod-001',
                product_name: 'Bibit Parfum Pesanan B2B',
                pack_size_kg: 25,
                unit_count: 1,
                batch_number: 'LOT-2026-FEFO',
                verified: isDelivered,
              }
            ],
          });
        }
      } else {
        tasks = [];
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
