import pushService from '../services/pushService.js';

/**
 * Push notification controller.
 * Handles subscription management and VAPID key retrieval.
 */

// GET /api/push/vapid-public-key
export const getVapidPublicKey = (req, res) => {
    const key = pushService.getVapidPublicKey();
    if (!key) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey: key });
};

// POST /api/push/subscribe
export const subscribe = async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.userId;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        await pushService.saveSubscription(userId, subscription);
        res.json({ message: 'Push subscription saved successfully' });
    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ error: 'Failed to save push subscription', detail: error.message });
    }
};

// DELETE /api/push/unsubscribe
export const unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        const userId = req.user.userId;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint is required' });
        }

        await pushService.removeSubscription(userId, endpoint);
        res.json({ message: 'Push subscription removed successfully' });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to remove push subscription' });
    }
};
