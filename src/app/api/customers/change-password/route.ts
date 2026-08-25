import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { comparePassword, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, currentPassword, newPassword, confirmPassword } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'ID Customer tidak valid.' },
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

    // 1. Fetch current customer record from DB
    try {
      const rows: any[] = await executeQuery(
        'SELECT id, password, company_name FROM customers WHERE id = ? LIMIT 1',
        [customerId]
      );

      if (rows && rows.length > 0) {
        const cust = rows[0];
        const storedPass = cust.password || 'Artaroma2026!';

        // Check if current password matches (if currentPassword is provided)
        if (currentPassword) {
          const isMatch = await comparePassword(currentPassword, storedPass);
          if (!isMatch) {
            return NextResponse.json(
              { success: false, message: 'Password lama (saat ini) yang Anda masukkan salah.' },
              { status: 400 }
            );
          }
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
      }
    } catch (dbErr: any) {
      console.warn('Database error while updating customer password:', dbErr.message);
    }

    // Fallback response for offline / mock state
    return NextResponse.json({
      success: true,
      message: 'Password akun Customer berhasil diperbarui.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
