import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialAppUsers } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbUsers = await executeQuery<any[]>(
      "SELECT id, name, email, role, linked_entity_name, allowed_modules, is_active, is_hidden, created_at FROM users WHERE (is_hidden = 0 OR is_hidden IS NULL) AND LOWER(email) != 'boss@artaroma.com' AND LOWER(name) != 'bossanova' ORDER BY created_at ASC"
    );
    
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
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role || 'ADMIN',
          linked_entity_name: u.linked_entity_name || 'Artaroma HQ',
          allowed_modules: modules,
          is_active: Boolean(u.is_active),
          is_hidden: Boolean(u.is_hidden),
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
    const { id, name, email, role, linked_entity_name, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna wajib diisi.' },
        { status: 400 }
      );
    }

    await executeQuery(
      `UPDATE users 
       SET name = ?, email = ?, role = ?, linked_entity_name = ?, is_active = ?
       WHERE id = ?`,
      [
        name,
        email,
        role,
        linked_entity_name || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        id
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Profil pengguna berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('Update User Profile Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan profil pengguna.' },
      { status: 500 }
    );
  }
}
