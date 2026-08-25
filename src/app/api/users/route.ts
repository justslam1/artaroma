import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialAppUsers } from '@/lib/mock-data';
import { ensurePushTableExists } from '@/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensurePushTableExists();

    const dbUsers = await executeQuery<any[]>(
      "SELECT id, name, email, role, linked_entity_name, allowed_modules, notification_preferences, is_active, is_hidden, last_login, created_at FROM users WHERE (is_hidden = 0 OR is_hidden IS NULL) AND LOWER(email) != 'boss@artaroma.com' AND LOWER(name) != 'bossanova' ORDER BY created_at ASC"
    );

    let subscriptions: any[] = [];
    try {
      subscriptions = await executeQuery<any[]>('SELECT id, user_id, user_name, user_agent, updated_at FROM push_subscriptions');
    } catch {
      // ignore
    }
    
    if (dbUsers && dbUsers.length > 0) {
      const formatted = dbUsers.map((u) => {
        let modules: string[] = [];
        if (u.allowed_modules) {
          try {
            modules = typeof u.allowed_modules === 'string' ? JSON.parse(u.allowed_modules) : u.allowed_modules;
          } catch {
            modules = String(u.allowed_modules).split(',').map((s) => s.trim()).filter(Boolean);
          }
        }

        let notifPrefs = {
          orders: true,
          payments: true,
          dues: true,
          stock: true,
          deliveries: true,
        };

        if (u.notification_preferences) {
          try {
            const parsed = typeof u.notification_preferences === 'string' ? JSON.parse(u.notification_preferences) : u.notification_preferences;
            notifPrefs = { ...notifPrefs, ...parsed };
          } catch {
            // default
          }
        }

        const userSubs = subscriptions.filter(
          (s) => s.user_id === u.id || (s.user_name && s.user_name.toLowerCase() === u.name.toLowerCase())
        );

        let lastLoginFormatted: string | null = null;
        if (u.last_login) {
          try {
            const d = new Date(u.last_login);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            lastLoginFormatted = `${day}/${month}/${year} ${hours}:${minutes}`;
          } catch {
            lastLoginFormatted = String(u.last_login);
          }
        }

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role || 'ADMIN',
          linked_entity_name: u.linked_entity_name || 'Artaroma HQ',
          allowed_modules: modules,
          notification_preferences: notifPrefs,
          registered_devices_count: userSubs.length,
          registered_devices: userSubs,
          is_active: Boolean(u.is_active),
          is_hidden: Boolean(u.is_hidden),
          last_login: lastLoginFormatted,
          created_at: String(u.created_at).split('T')[0],
        };
      });
      return NextResponse.json({ success: true, data: formatted });
    }

    const filteredInitial = initialAppUsers.filter(
      (u) => !u.is_hidden && u.email.toLowerCase() !== 'boss@artaroma.com' && u.name.toLowerCase() !== 'bossanova'
    );
    return NextResponse.json({ success: true, data: filteredInitial });
  } catch (error: any) {
    const filteredInitial = initialAppUsers.filter(
      (u) => !u.is_hidden && u.email.toLowerCase() !== 'boss@artaroma.com' && u.name.toLowerCase() !== 'bossanova'
    );
    return NextResponse.json({ success: false, message: error.message, data: filteredInitial }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, role, linked_entity_name, is_active, notification_preferences } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna wajib diisi.' },
        { status: 400 }
      );
    }

    const notifJson = notification_preferences ? JSON.stringify(notification_preferences) : null;

    await executeQuery(
      `UPDATE users 
       SET name = ?, email = ?, role = ?, linked_entity_name = ?, is_active = ?, notification_preferences = COALESCE(?, notification_preferences)
       WHERE id = ?`,
      [
        name,
        email,
        role,
        linked_entity_name || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        notifJson,
        id
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Profil dan preferensi notifikasi pengguna berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('Update User Profile Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan profil pengguna.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna wajib diisi.' },
        { status: 400 }
      );
    }

    const activeVal = is_active ? 1 : 0;
    await executeQuery('UPDATE users SET is_active = ? WHERE id = ?', [activeVal, id]);

    return NextResponse.json({
      success: true,
      message: `Status pengguna berhasil diubah menjadi ${is_active ? 'AKTIF' : 'NON-AKTIF'}.`,
    });
  } catch (error: any) {
    console.error('Toggle User Status Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengubah status pengguna.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('user_id');

    if (action === 'revoke_devices' && userId) {
      await ensurePushTableExists();
      await executeQuery('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
      return NextResponse.json({
        success: true,
        message: 'Semua perangkat notifikasi untuk pengguna ini berhasil diputus.',
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid delete action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
