import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { code, name, phone, vehicle_number, courier_type, service_type, notes, is_active } = body;
    const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    const typeVal = courier_type === 'EKSTERNAL' ? 'EKSTERNAL' : 'INTERNAL';
    
    // Get old courier before update for syncing
    const oldCouriers: any[] = await executeQuery('SELECT name, courier_type FROM couriers WHERE id = ?', [id]);
    const oldCourier = oldCouriers && oldCouriers[0] ? oldCouriers[0] : null;
    const oldName = oldCourier ? oldCourier.name : null;

    // 1. Update couriers table
    await executeQuery(
      `UPDATE couriers 
       SET code = ?, name = ?, phone = ?, vehicle_number = ?, courier_type = ?, service_type = ?, notes = ?, is_active = ?
       WHERE id = ?`,
      [
        code,
        name,
        phone,
        vehicle_number || null,
        typeVal,
        service_type || null,
        notes || null,
        activeVal,
        id
      ]
    );

    // 2. Cascade user account logic based on courier_type
    try {
      if (typeVal === 'EKSTERNAL') {
        // If switched to external, remove any courier login account
        if (oldName) {
          await executeQuery("DELETE FROM users WHERE role = 'COURIER' AND (name = ? OR name = ?)", [oldName, name]);
        }
      } else {
        // If INTERNAL, update or create user account if needed
        const entityLabel = vehicle_number ? `Armada ${vehicle_number} (${name})` : `Armada Kurir (${name})`;
        const existingUsers: any[] = await executeQuery("SELECT id FROM users WHERE role = 'COURIER' AND (name = ? OR name = ?)", [oldName, name]);
        
        if (existingUsers && existingUsers.length > 0) {
          await executeQuery(
            `UPDATE users 
             SET name = ?, linked_entity_name = ?, is_active = ?
             WHERE role = 'COURIER' AND (name = ? OR name = ?)`,
            [name, entityLabel, activeVal, oldName, name]
          );
        }
      }
    } catch (uErr: any) {
      console.warn('Syncing courier user update warning:', uErr.message);
    }
    
    return NextResponse.json({ success: true, message: 'Data Kurir berhasil diperbarui.' });
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
