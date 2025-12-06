import express from 'express';
import { inventoryController } from '../controllers/inventoryController.js';
import { materialMonitoringController } from '../controllers/inventoryMaterial.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken, requireAdmin);

// Basic routes (should all work now)
router.get('/', inventoryController.getInventory);
router.get('/categories', inventoryController.getCategories);
router.get('/alerts/low-stock', inventoryController.getLowStockAlerts);
router.get('/:id', inventoryController.getInventoryItem);
router.post('/', inventoryController.createInventory);
router.put('/:id', inventoryController.updateInventory);
router.delete('/:id', inventoryController.deleteInventory);

// Sheets-based routes
router.post('/:id/add-stock', inventoryController.addStock);
router.post('/usage/record-sheets', inventoryController.recordUsageSheets);
router.get('/:id/history', inventoryController.getMaterialHistory);
router.post('/calculate-sheets', inventoryController.calculateSheets);
router.get('/:id/stock-check', inventoryController.quickStockCheck);

// Old compatibility routes
router.post('/usage/record', inventoryController.recordUsage);
router.post('/waste/record', inventoryController.recordWaste);
router.post('/stock/adjust', inventoryController.adjustStock);

// Monitoring routes
router.get('/monitoring/usage-trends', materialMonitoringController.getMaterialUsageTrends);
router.get('/monitoring/waste-analysis', materialMonitoringController.getWasteAnalysis);
router.get('/monitoring/stock-levels', materialMonitoringController.getStockLevels);
router.get('/monitoring/cost-analysis', materialMonitoringController.getMaterialCostAnalysis);
router.get('/monitoring/automatic-updates', materialMonitoringController.getAutomaticStockUpdates);

export default router;