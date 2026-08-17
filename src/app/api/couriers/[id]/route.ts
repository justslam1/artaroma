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
    const activeVal = is_active ? 1 : 0;
    
    // Get old courier name before update for syncing
    const oldCouriers: any[] = await executeQuery('SELECT name FROM couriers WHERE id = ?', [id]);
    const oldName = oldCouriers && oldCouriers[0] ? oldCouriers[0].name : null;

    // 1. Update couriers table
    await executeQuery(
      `UPDATE couriers 
       SET code = ?, name = ?, phone = ?, vehicle_number = ?, is_active = ?
       WHERE id = ?`,
      [
        code,
        name,
        phone,
        vehicle_number || null,
        activeVal,
        id
      ]
    );

    // 2. Cascade update to users table
    try {
      const entityLabel = vehicle_number ? `Armada ${vehicle_number} (${name})` : `Armada Kurir (${name})`;
      if (oldName) {
        await executeQuery(
          `UPDATE users 
           SET name = ?, linked_entity_name = ?, is_active = ?
           WHERE role = 'COURIER' AND (name = ? OR name = ?)`,
          [name, entityLabel, activeVal, oldName, name]
        );
      }
    } catch (uErr: any) {
      console.warn('Syncing courier user update warning:', uErr.message);
    }
    
    return NextResponse.json({ success: true, message: 'Data Kurir dan Akun Pengguna berhasil diperbarui.' });
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
    
    // Get courier name to remove linked user
    const oldCouriers: any[] = await executeQuery('SELECT name FROM couriers WHERE id = ?', [id]);
    const oldName = oldCouriers && oldCouriers[0] ? oldCouriers[0].name : null;

    await executeQuery('DELETE FROM couriers WHERE id = ?', [id]);

    if (oldName) {
      try {
        await executeQuery("DELETE FROM users WHERE role = 'COURIER' AND name = ?", [oldName]);
      } catch (uErr: any) {
        console.warn('Deleting linked courier user warning:', uErr.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Kurir dan Akun Pengguna terkait berhasil dihapus.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete courier' },
      { status: 500 }
    );
  }
}
