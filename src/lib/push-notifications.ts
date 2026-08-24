import webpush from 'web-push';
import { executeQuery, executeTransaction } from './db';

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BM9QPDrwRa9vksAlQaqWZNLXoFuDhQVJ1TWa-Injbe_8lczvRx71UksVfZeekVcrmFsUi9FtsKMm0XG249z2Vs0';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'dztnsKE7NNv6_mB0W1hc2TwUwQr7V4G-slBF0dNGMgk';

// Initialize web-push configuration
try {
  webpush.setVapidDetails(
    'mailto:admin@artaroma.co.id',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (err: any) {
  console.warn('[WebPush] VAPID initialization warning:', err.message);
}

/**
 * Ensure push_subscriptions table exists in MySQL database
 */
export async function ensurePushTableExists() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id VARCHAR(64) PRIMARY KEY,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        user_id VARCHAR(64) DEFAULT NULL,
        user_name VARCHAR(100) DEFAULT NULL,
        user_role VARCHAR(50) DEFAULT 'ADMIN',
        user_agent TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err: any) {
    console.warn('[WebPush] Table migration warning:', err.message);
  }
}

/**
 * Save or update a client push subscription in MySQL
 */
export async function savePushSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  user?: { id?: string; name?: string; role?: string; userAgent?: string }
) {
  await ensurePushTableExists();

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error('Invalid subscription object');
  }

  const { endpoint, keys } = subscription;
  const { p256dh, auth } = keys;

  // Use a short deterministic ID or hash from endpoint
  const subId = 'sub-' + Buffer.from(endpoint).toString('base64').substring(0, 48).replace(/[^a-zA-Z0-9]/g, '');

  await executeQuery(
    `INSERT INTO push_subscriptions 
      (id, endpoint, p256dh, auth, user_id, user_name, user_role, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
      endpoint = VALUES(endpoint),
      p256dh = VALUES(p256dh),
      auth = VALUES(auth),
      user_id = VALUES(user_id),
      user_name = VALUES(user_name),
      user_role = VALUES(user_role),
      user_agent = VALUES(user_agent),
      updated_at = CURRENT_TIMESTAMP`,
    [
      subId,
      endpoint,
      p256dh,
      auth,
      user?.id || null,
      user?.name || 'Admin',
      user?.role || 'ADMIN',
      user?.userAgent || null,
    ]
  );

  return { success: true, id: subId };
}

/**
 * Remove a push subscription by endpoint or ID
 */
export async function removePushSubscription(endpointOrId: string) {
  try {
    await executeQuery(
      `DELETE FROM push_subscriptions WHERE id = ? OR endpoint = ?`,
      [endpointOrId, endpointOrId]
    );
  } catch (e) {
    console.warn('[WebPush] remove subscription error:', e);
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * Send Web Push notification to all active subscribers (e.g. Admin phones & tablets)
 */
export async function sendPushNotificationToAll(payload: PushNotificationPayload) {
  await ensurePushTableExists();

  let subscribers: any[] = [];
  try {
    subscribers = await executeQuery(`SELECT * FROM push_subscriptions`);
  } catch (err: any) {
    console.warn('[WebPush] Fetch subscribers error:', err.message);
    return { success: false, sentCount: 0 };
  }

  if (!subscribers || subscribers.length === 0) {
    return { success: true, sentCount: 0, message: 'No registered devices found' };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/icon.png',
    data: {
      url: payload.url || '/admin',
    },
    tag: payload.tag || 'artaroma-notification',
  });

  let sentCount = 0;
  const expiredEndpoints: string[] = [];

  for (const sub of subscribers) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, notificationPayload, {
        TTL: 86400, // 24 hours
        urgency: 'high',
      });
      sentCount++;
    } catch (err: any) {
      console.warn(`[WebPush] Failed sending to subscriber ${sub.id}:`, err.statusCode || err.message);
      // If subscription expired or gone (404, 410), clean it up
      if (err.statusCode === 404 || err.statusCode === 410) {
        expiredEndpoints.push(sub.id);
      }
    }
  }

  // Cleanup expired subscriptions
  if (expiredEndpoints.length > 0) {
    try {
      await executeQuery(
        `DELETE FROM push_subscriptions WHERE id IN (${expiredEndpoints.map(() => '?').join(',')})`,
        expiredEndpoints
      );
    } catch (e) {
      console.warn('[WebPush] Cleanup error:', e);
    }
  }

  return {
    success: true,
    totalSubscribers: subscribers.length,
    sentCount,
  };
}
