import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const couriers = await executeQuery('SELECT * FROM couriers ORDER BY code ASC');
    
    // Also fetch users to attach linked user email for UI badge
    const users: any[] = await executeQuery("SELECT id, name, email, is_active FROM users WHERE role = 'COURIER'");
    
    const enriched = (couriers || []).map((c: any) => {
      const cName = (c.name || '').toLowerCase();
      const matchedUser = users.find(
        (u: any) =>
          (u.name || '').toLowerCase() === cName ||
          (u.name || '').toLowerCase().includes(cName) ||
          cName.includes((u.name || '').toLowerCase())
      );
      return {
        ...c,
        linked_user_id: matchedUser ? matchedUser.id : null,
        linked_user_email: matchedUser ? matchedUser.email : null,
        has_login_account: !!matchedUser,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
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
    const { id, code, name, phone, vehicle_number, is_active, create_user_account, login_email, password } = body;
    const courierId = id || `cour-${Date.now()}`;
    const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    
    // 1. Insert into couriers table
    await executeQuery(
      `INSERT INTO couriers (id, code, name, phone, vehicle_number, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        courierId,
        code,
        name,
        phone,
        vehicle_number || null,
        activeVal
      ]
    );

    // 2. Auto-provision user account if requested (default: true)
    if (create_user_account !== false) {
      const cleanName = (name || 'kurir').toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
      const userEmail = (login_email && login_email.trim()) ? login_email.trim() : `${cleanName}@artaroma.co.id`;
      const userPassword = (password && password.trim()) ? password.trim() : 'Artaroma2026!';
      const userId = `usr-cour-${Date.now()}`;
      const entityLabel = vehicle_number ? `Armada ${vehicle_number} (${name})` : `Armada Kurir (${name})`;

      try {
        // Delete any existing user with same email to avoid unique collision
        await executeQuery('DELETE FROM users WHERE email = ?', [userEmail]);

        await executeQuery(
          `INSERT INTO users (id, name, email, role, linked_entity_name, allowed_modules, password, is_active)
           VALUES (?, ?, ?, 'COURIER', ?, ?, ?, ?)`,
          [
            userId,
            name,
            userEmail,
            entityLabel,
            JSON.stringify(['Aplikasi Kurir']),
            userPassword,
            activeVal
          ]
        );
      } catch (uErr: any) {
        console.warn('Auto-provisioning courier user account warning:', uErr.message);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Kurir dan akun login pengguna berhasil dibuat secara otomatis.',
      data: { id: courierId, name } 
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create courier' },
      { status: 500 }
    );
  }
}
