import express from 'express';
import { customerController } from '../controllers/customerController.js';

const router = express.Router();

router.post('/customers', customerController.createCustomer);

// Get all customers with pagination and search
router.get('/customers', customerController.getCustomers);

// Get customer details with job history
router.get('/customers/:id', customerController.getCustomer);

// Search customers (quick search)
router.get('/customers/search/:query', customerController.searchCustomers);

// Update customer information
router.put('/customers/:id', customerController.updateCustomer);

// Get customer statistics
router.get('/customers-stats', customerController.getCustomerStats);

export default router;