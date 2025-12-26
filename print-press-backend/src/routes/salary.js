import express from 'express';
import { salaryController } from '../controllers/salaryController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All salary routes require Admin access
router.use(authenticateToken, requireAdmin);

router.get('/', (req, res) => salaryController.getSalaries(req, res));
router.post('/', (req, res) => salaryController.createSalary(req, res));
router.get('/stats', (req, res) => salaryController.getSalaryStats(req, res));

export default router;
