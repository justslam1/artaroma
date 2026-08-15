import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const couriers = await executeQuery('SELECT * FROM couriers ORDER BY code ASC');
    return NextResponse.json({
      success: true,
      data: couriers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to load couriers' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, code, name, phone, vehicle_number, is_active } = body;
    
    await executeQuery(
      `INSERT INTO couriers (id, code, name, phone, vehicle_number, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id || `cour-${Date.now()}`,
        code,
        name,
        phone,
        vehicle_number || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );
    
    return NextResponse.json({ success: true, message: 'Courier created successfully.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create courier' },
      { status: 500 }
    );
  }
}
