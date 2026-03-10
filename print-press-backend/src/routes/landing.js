import express from 'express';
import multer from 'multer';
import {
  createCategory,
  createPortfolioItem,
  deleteCategory,
  deletePortfolioItem,
  getAdminWebsiteData,
  getPublicLandingData,
  getPublicPortfolio,
  uploadLandingMedia,
  updateCategory,
  updateLandingContent,
  updatePortfolioItem,
} from '../controllers/landingController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type. Only images and videos are allowed.'));
  },
});

// Public endpoints
router.get('/public', getPublicLandingData);
router.get('/portfolio', getPublicPortfolio);

// Admin endpoints
router.get('/admin', authenticateToken, requireAdmin, getAdminWebsiteData);
router.put('/content', authenticateToken, requireAdmin, updateLandingContent);
router.post('/upload-media', authenticateToken, requireAdmin, upload.single('media'), uploadLandingMedia);

router.post('/categories', authenticateToken, requireAdmin, createCategory);
router.put('/categories/:id', authenticateToken, requireAdmin, updateCategory);
router.delete('/categories/:id', authenticateToken, requireAdmin, deleteCategory);

router.post('/portfolio-items', authenticateToken, requireAdmin, createPortfolioItem);
router.put('/portfolio-items/:id', authenticateToken, requireAdmin, updatePortfolioItem);
router.delete('/portfolio-items/:id', authenticateToken, requireAdmin, deletePortfolioItem);

export default router;
