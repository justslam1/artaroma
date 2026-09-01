export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, normalizePhoneNumber } from '@/lib/whatsapp';
import { verifyApiAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Master Data']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { target, token, message } = body;

    if (!target) {
      return NextResponse.json(
        { success: false, message: 'Nomor WhatsApp tujuan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const testMessage =
      message ||
      `✅ *TEST KONEKSI WHATSAPP GATEWAY ARTAROMA HUB*\n\n` +
      `Halo! Integrasi WhatsApp Gateway Fonnte di sistem *PT Artaroma Jayatama* berhasil terhubung dengan lancar.\n` +
      `Waktu tes: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.\n\n` +
      `_Sistem siap mengirimkan notifikasi pesanan masuk otomatis ke nomor ini._`;

    const result = await sendWhatsAppMessage({
      target,
      token,
      message: testMessage,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Pesan tes WhatsApp berhasil dikirim ke ${normalizePhoneNumber(target)}!`,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.error || 'Gagal mengirim pesan WhatsApp. Periksa Token API atau Nomor Tujuan.',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[API WA Test] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error saat menguji WhatsApp' },
      { status: 500 }
    );
  }
}
