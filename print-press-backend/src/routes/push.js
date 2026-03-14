import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getVapidPublicKey, subscribe, unsubscribe } from '../controllers/pushController.js';

const router = express.Router();

// Public route - frontend needs the VAPID key before subscribing
router.get('/vapid-public-key', getVapidPublicKey);

// Protected routes - require authentication
router.post('/subscribe', authenticateToken, subscribe);
router.delete('/unsubscribe', authenticateToken, unsubscribe);

export default router;
