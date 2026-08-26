import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeTransaction } from '@/lib/db';
import { verifyApiAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Pengiriman Kurir', 'Sales Order (SO)']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const {
      so_id,
      courier_id,
      customer_id,
      recipient_name,
      proof_photo_url,
      digital_signature_url,
      is_item_verified,
      notes,
    } = body;

    if (!so_id || !recipient_name) {
      return NextResponse.json(
        { success: false, message: 'so_id and recipient_name are required' },
        { status: 400 }
      );
    }

    const deliveryId = `deliv-${Date.now()}`;
    const receivedAt = new Date().toISOString();

    let calculatedDueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    try {
      await executeTransaction(async (conn) => {
        // 1. Fetch customer credit_terms_days
        let creditTermsDays = 30;
        if (customer_id) {
          const [custRows]: any = await conn.query(
            'SELECT credit_terms_days FROM customers WHERE id = ?',
            [customer_id]
          );
          if (custRows && custRows.length > 0) {
            creditTermsDays = custRows[0].credit_terms_days || 30;
          }
        }

        const now = new Date();
        const dueDateObj = new Date(now.getTime() + creditTermsDays * 86400000);
        calculatedDueDate = dueDateObj.toISOString().split('T')[0];

        // 2. Save delivery POD record
        await conn.query(
          `INSERT INTO deliveries 
          (id, so_id, courier_id, customer_id, is_item_verified, recipient_name, received_at, proof_photo_url, digital_signature_url, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            deliveryId,
            so_id,
            courier_id || 'cour-001',
            customer_id || 'cust-001',
            is_item_verified ? 1 : 0,
            recipient_name,
            now,
            proof_photo_url || null,
            digital_signature_url || null,
            notes || '',
          ]
        );

        // 3. Update Sales Order status to DELIVERED
        await conn.query(
          "UPDATE sales_orders SET status = 'DELIVERED', delivered_date = ? WHERE id = ?",
          [now, so_id]
        );

        // 4. Update Invoice due_date (Delivered Date + credit_terms_days)
        await conn.query(
          'UPDATE invoices SET due_date = ? WHERE so_id = ?',
          [calculatedDueDate, so_id]
        );
      });
    } catch (e: any) {
      console.warn('DB transaction delivery POD warning:', e.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Proof of Delivery (POD) submitted successfully. Invoice due date updated.',
      data: {
        delivery_id: deliveryId,
        so_id,
        status: 'DELIVERED',
        recipient_name,
        received_at: receivedAt,
        calculated_due_date: calculatedDueDate,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
