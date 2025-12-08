// print-press-backend/src/routes/inventory.js
import express from 'express';
import { inventoryController } from '../controllers/inventoryController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all inventory routes
router.use(authenticateToken);

// Public routes (for workers)
router.get('/', inventoryController.getInventory);
router.get('/categories', inventoryController.getCategories);
router.get('/attribute-templates', inventoryController.getAttributeTemplates); // Add this line
router.get('/:id', inventoryController.getInventoryItem);
router.get('/search', inventoryController.searchInventory); // Add this line

// Admin-only routes
router.post('/', requireAdmin, inventoryController.createInventory);
router.put('/:id', requireAdmin, inventoryController.updateInventory);
router.delete('/:id', requireAdmin, inventoryController.deleteInventory);

// Stock adjustment routes (admin only)
router.post('/:id/adjust-stock', requireAdmin, inventoryController.adjustStock);

// Material usage routes (admin and workers)
router.post('/record-usage', inventoryController.recordUsage);

// Material monitoring routes (admin only)
router.get('/monitoring/usage-trends', requireAdmin, inventoryController.getMaterialUsageTrends);
router.get('/monitoring/stock-levels', requireAdmin, inventoryController.getStockLevels);
router.get('/monitoring/cost-analysis', requireAdmin, inventoryController.getCostAnalysis);
router.get('/monitoring/automatic-updates', requireAdmin, inventoryController.getAutomaticStockUpdates);
router.get('/monitoring/waste-analysis', requireAdmin, inventoryController.getWasteAnalysis);
router.get('/monitoring/material-cost-analysis', requireAdmin, inventoryController.getMaterialCostAnalysis);

// Material history routes
router.get('/material-history', inventoryController.getMaterialHistory);

// Quick stock check
router.get('/:id/stock-check', inventoryController.quickStockCheck);

// Calculate sheets
router.post('/calculate-sheets', inventoryController.calculateSheets);

// Job materials update
router.post('/job/:jobId/materials', requireAdmin, inventoryController.updateJobMaterials);

export default router;