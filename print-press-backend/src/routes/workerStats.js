// routes/workerStats.js
import { Router } from 'express';
import { workerStatsController } from '../controllers/workerStatsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Worker dashboard statistics
router.get('/', authenticateToken, (req, res) => workerStatsController.getWorkerStats(req, res));

export default router;
