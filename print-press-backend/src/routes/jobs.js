// routes/jobRoutes.js
import express from 'express';
import {
  getAllJobs,
  getJobById,
  createJob,
  updateJobStatus,
  getJobByTicketId,
  updateJob,
  deleteJob
} from '../controllers/jobController.js';
import { authenticateToken, requireWorkerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken, requireWorkerOrAdmin);

router.get('/', getAllJobs);
router.get('/ticket/:ticketId', getJobByTicketId);
router.get('/:id', getJobById);
router.post('/', createJob);
router.patch('/:id/status', updateJobStatus);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

export default router;