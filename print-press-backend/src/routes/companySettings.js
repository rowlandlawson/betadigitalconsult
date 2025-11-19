/**
 * COMPANY SETTINGS ROUTES
 * Path: src/routes/companySettings.js
 * 
 * Routes for company settings API
 * 
 * Endpoints:
 * - GET /api/company-settings - Get company settings (public)
 * - PUT /api/company-settings - Update settings (admin only)
 * - POST /api/company-settings/upload-logo - Upload logo (admin only)
 * - DELETE /api/company-settings/logo - Delete logo (admin only)
 */

import express from 'express';
import multer from 'multer';
import {
  getCompanySettings,
  updateCompanySettings,
  uploadLogo,
  deleteLogo,
} from '../controllers/companySettingsController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for logo upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'));
    }
  },
});

/**
 * @route   GET /api/company-settings
 * @desc    Get company settings
 * @access  Public
 */
router.get('/', getCompanySettings);

/**
 * @route   PUT /api/company-settings
 * @desc    Update company settings
 * @access  Private (Admin only)
 */
router.put('/', authenticateToken, requireAdmin, updateCompanySettings);

/**
 * @route   POST /api/company-settings/upload-logo
 * @desc    Upload company logo
 * @access  Private (Admin only)
 */
router.post('/upload-logo', authenticateToken, requireAdmin, upload.single('logo'), uploadLogo);

/**
 * @route   DELETE /api/company-settings/logo
 * @desc    Delete company logo
 * @access  Private (Admin only)
 */
router.delete('/logo', authenticateToken, requireAdmin, deleteLogo);

export default router;
