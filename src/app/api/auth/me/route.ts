import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Belum terautentikasi (Unauthorized).' },
      { status: 401 }
    );
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Sesi login telah kedaluwarsa atau token tidak valid.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: payload,
  });
}
