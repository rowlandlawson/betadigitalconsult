import express from 'express';
import { inventoryController } from '../controllers/inventoryController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Sheets-based inventory routes
router.post('/:id/add-stock', inventoryController.addStock.bind(inventoryController));
router.post('/usage/record', inventoryController.recordUsage.bind(inventoryController));
router.get('/:id/history', inventoryController.getMaterialHistory.bind(inventoryController));
router.post('/jobs/:jobId/materials', inventoryController.updateJobMaterials.bind(inventoryController));

export default router;