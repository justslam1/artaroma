import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyApiAuth } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Master Data']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { userId, allowed_modules } = body;

    if (!userId || !Array.isArray(allowed_modules)) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna dan daftar modul wajib diisi.' },
        { status: 400 }
      );
    }

    const modulesJson = JSON.stringify(allowed_modules);

    await executeQuery(
      'UPDATE users SET allowed_modules = ? WHERE id = ?',
      [modulesJson, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Hak akses modul berhasil diperbarui.',
      userId,
      allowed_modules,
    });
  } catch (error: any) {
    console.error('Update User Access Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan hak akses.' },
      { status: 500 }
    );
  }
}
