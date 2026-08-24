import { NextRequest, NextResponse } from 'next/server';
import {
  VAPID_PUBLIC_KEY,
  savePushSubscription,
  removePushSubscription,
  sendPushNotificationToAll,
  ensurePushTableExists,
} from '@/lib/push-notifications';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    await ensurePushTableExists();

    let count = 0;
    try {
      const rows: any = await executeQuery('SELECT COUNT(*) as count FROM push_subscriptions');
      if (rows && rows[0]) {
        count = Number(rows[0].count) || 0;
      }
    } catch (e) {
      // ignore
    }

    return NextResponse.json({
      success: true,
      vapidPublicKey: VAPID_PUBLIC_KEY,
      subscriberCount: count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat status push notification' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'subscribe', subscription, user, payload } = body;

    if (action === 'subscribe') {
      if (!subscription) {
        return NextResponse.json(
          { success: false, message: 'Subscription object is required' },
          { status: 400 }
        );
      }

      await savePushSubscription(subscription, {
        ...user,
        userAgent: req.headers.get('user-agent') || 'Mobile Web App',
      });

      return NextResponse.json({
        success: true,
        message: 'Perangkat HP / Browser Anda berhasil didaftarkan untuk Push Notification!',
      });
    }

    if (action === 'unsubscribe') {
      if (subscription?.endpoint) {
        await removePushSubscription(subscription.endpoint);
      }
      return NextResponse.json({
        success: true,
        message: 'Push Notification dinonaktifkan pada perangkat ini.',
      });
    }

    if (action === 'test') {
      const result = await sendPushNotificationToAll({
        title: payload?.title || '🔔 Uji Coba Notifikasi Artaroma',
        body:
          payload?.body ||
          'Push Notification di HP Anda berhasil aktif! Anda akan menerima peringatan pesanan baru & bukti transfer secara instan.',
        icon: '/icon.png',
        badge: '/icon.png',
        url: '/admin',
        tag: 'artaroma-test-push',
      });

      return NextResponse.json({
        success: true,
        message: `Notifikasi uji coba berhasil dikirim ke ${result.sentCount} perangkat terdaftar!`,
        result,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Push notification API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
