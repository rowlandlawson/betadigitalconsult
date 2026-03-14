import webPushModule from 'web-push';
import { pool } from '../config/database.js';

// Handle CJS/ESM interop — web-push may export on .default or directly
const webPush = webPushModule.default || webPushModule;

/**
 * PushService handles Web Push Notifications.
 * - Manages push subscriptions in the database
 * - Sends push notifications to users via the Web Push protocol
 * - Auto-generates VAPID keys if not configured
 */
class PushService {
    constructor() {
        this.initialized = false;
        this.vapidPublicKey = null;
    }

    /**
     * Initialize web-push with VAPID keys.
     * Call this once at server startup.
     */
    init() {
        try {
            if (!webPush || typeof webPush.generateVAPIDKeys !== 'function') {
                console.error('❌ web-push module not loaded correctly. Available:', Object.keys(webPush || {}));
                this.initialized = false;
                return;
            }

            let publicKey = process.env.VAPID_PUBLIC_KEY;
            let privateKey = process.env.VAPID_PRIVATE_KEY;
            const subject = process.env.VAPID_SUBJECT || `mailto:${process.env.ADMIN_EMAIL || 'admin@printpress.com'}`;

            // Auto-generate VAPID keys if not configured
            if (!publicKey || !privateKey) {
                console.log('⚠️  VAPID keys not found in .env, generating new keys...');
                const keys = webPush.generateVAPIDKeys();
                publicKey = keys.publicKey;
                privateKey = keys.privateKey;
                console.log('🔑 Generated VAPID keys. Add these to your .env file:');
                console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
                console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
                console.log(`VAPID_SUBJECT=${subject}`);
            }

            webPush.setVapidDetails(subject, publicKey, privateKey);
            this.vapidPublicKey = publicKey;
            this.initialized = true;
            console.log('✅ Push notification service initialized');
        } catch (error) {
            console.error('❌ Push service initialization failed:', error.message);
            this.initialized = false;
        }
    }

    /**
     * Ensure the push_subscriptions table exists.
     */
    async ensureTable() {
        try {
            await pool.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          p256dh_key TEXT NOT NULL,
          auth_key TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          last_used_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, endpoint)
        )
      `);
            // Create index if not exists
            await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)
      `);
            console.log('✅ push_subscriptions table ready');
        } catch (error) {
            console.error('❌ Error creating push_subscriptions table:', error.message);
        }
    }

    /**
     * Get the VAPID public key for frontend subscription.
     */
    getVapidPublicKey() {
        return this.vapidPublicKey;
    }

    /**
     * Save a push subscription for a user.
     */
    async saveSubscription(userId, subscription) {
        const { endpoint, keys } = subscription;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            throw new Error('Invalid push subscription: missing endpoint or keys');
        }

        await pool.query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) 
       DO UPDATE SET p256dh_key = $3, auth_key = $4, last_used_at = NOW()`,
            [userId, endpoint, keys.p256dh, keys.auth]
        );

        console.log(`📲 Push subscription saved for user ${userId}`);
    }

    /**
     * Remove a push subscription.
     */
    async removeSubscription(userId, endpoint) {
        await pool.query(
            'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
            [userId, endpoint]
        );
        console.log(`🗑️ Push subscription removed for user ${userId}`);
    }

    /**
     * Send a push notification to a specific user (all their devices).
     */
    async sendPushToUser(userId, payload) {
        if (!this.initialized) return;

        try {
            const result = await pool.query(
                'SELECT id, endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) return;

            const pushPayload = JSON.stringify({
                title: payload.title || 'Print Press',
                body: payload.body || payload.message || '',
                icon: '/logo.png',
                badge: '/logo.png',
                url: payload.url || '/admin/notifications',
                tag: payload.tag || `notification-${Date.now()}`,
                data: {
                    url: payload.url || '/admin/notifications',
                    notificationId: payload.notificationId,
                }
            });

            const sendPromises = result.rows.map(async (sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh_key, auth: sub.auth_key }
                };

                try {
                    await webPush.sendNotification(pushSubscription, pushPayload);
                    // Update last_used_at
                    await pool.query(
                        'UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = $1',
                        [sub.id]
                    );
                } catch (error) {
                    // 404 or 410 = subscription expired/invalid, remove it
                    if (error.statusCode === 404 || error.statusCode === 410) {
                        console.log(`🗑️ Removing expired subscription ${sub.id}`);
                        await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                    } else {
                        console.error(`Failed to send push to subscription ${sub.id}:`, error.message);
                    }
                }
            });

            await Promise.allSettled(sendPromises);
        } catch (error) {
            console.error('Push notification error for user:', error.message);
        }
    }

    /**
     * Send a push notification to all admin users.
     */
    async sendPushToAdmins(payload) {
        if (!this.initialized) return;

        try {
            const adminResult = await pool.query(
                'SELECT id FROM users WHERE role = $1 AND is_active = true',
                ['admin']
            );

            const sendPromises = adminResult.rows.map(admin =>
                this.sendPushToUser(admin.id, payload)
            );

            await Promise.allSettled(sendPromises);
        } catch (error) {
            console.error('Push notification error for admins:', error.message);
        }
    }

    /**
     * Send a push notification to a user AND all admins.
     */
    async sendPushToUserAndAdmins(userId, payload) {
        if (!this.initialized) return;

        await Promise.allSettled([
            this.sendPushToUser(userId, payload),
            this.sendPushToAdmins(payload)
        ]);
    }
}

// Export singleton
const pushService = new PushService();
export default pushService;
