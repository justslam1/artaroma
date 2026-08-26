import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { comparePassword, hashPassword, getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Sesi login tidak ditemukan atau kedaluwarsa.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { customerId, currentPassword, newPassword, confirmPassword } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'ID Customer tidak valid.' },
        { status: 400 }
      );
    }

    // Verify that the requester is either an Admin or the Customer owning this account (BOLA / IDOR protection)
    const isAdmin = user.is_super_admin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isOwner = user.customer_id === customerId || user.id === customerId || user.id === `usr-cust-${customerId}`;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Anda tidak berhak mengubah password akun ini.' },
        { status: 403 }
      );
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Password saat ini (lama) wajib diisi.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password baru minimal harus terdiri dari 6 karakter.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Konfirmasi password baru tidak cocok.' },
        { status: 400 }
      );
    }

    // Fetch current customer record from DB
    const rows: any[] = await executeQuery(
      'SELECT id, password, company_name FROM customers WHERE id = ? LIMIT 1',
      [customerId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Akun customer tidak ditemukan di database.' },
        { status: 404 }
      );
    }

    const cust = rows[0];
    const storedPass = cust.password || 'Artaroma2026!';

    // Verify current password
    const isMatch = await comparePassword(currentPassword, storedPass);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Password lama (saat ini) yang Anda masukkan salah.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashed = await hashPassword(newPassword.trim());

    // Update database
    await executeQuery(
      'UPDATE customers SET password = ? WHERE id = ?',
      [hashed, customerId]
    );

    return NextResponse.json({
      success: true,
      message: 'Password akun Customer berhasil diperbarui. Silakan gunakan password baru pada login berikutnya.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
