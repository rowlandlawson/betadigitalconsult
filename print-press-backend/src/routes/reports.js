import express from 'express';
import { reportsController } from '../controllers/reportsController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply admin middleware to all report routes
router.use(authenticateToken, requireAdmin);

router.get('/dashboard-stats', reportsController.getDashboardStatistics);

// Financial reports routes
router.get('/financial-summary', reportsController.getMonthlyFinancialSummary);
router.get('/profit-loss', reportsController.getProfitLossStatement);

// Material monitoring and analytics routes
router.get('/material-monitoring', reportsController.getMaterialMonitoringDashboard);

// Business performance routes
router.get('/business-performance', reportsController.getBusinessPerformance);

// Data export routes
router.get('/export', reportsController.exportReportData);

export default router;