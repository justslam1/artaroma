import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { code, name, phone, vehicle_number, is_active } = body;
    
    await executeQuery(
      `UPDATE couriers 
       SET code = ?, name = ?, phone = ?, vehicle_number = ?, is_active = ?
       WHERE id = ?`,
      [
        code,
        name,
        phone,
        vehicle_number || null,
        is_active ? 1 : 0,
        id
      ]
    );
    
    return NextResponse.json({ success: true, message: 'Courier updated successfully.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update courier' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await executeQuery('DELETE FROM couriers WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Courier deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete courier' },
      { status: 500 }
    );
  }
}
