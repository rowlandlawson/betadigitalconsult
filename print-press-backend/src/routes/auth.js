import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { 
  login, 
  refreshToken,
  adminLogin,
  register,
  getCurrentUser, 
  changePassword, 
  updateProfile,
  forgotPassword,
  resetPassword,
  adminResetUserPassword
} from '../controllers/authController.js';

const router = express.Router();

// Public routes (no authentication required)
router.post('/register', register);
router.post('/refresh', refreshToken);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (require any valid token)
router.get('/me', authenticateToken, getCurrentUser);
router.post('/change-password', authenticateToken, changePassword);
router.put('/profile', authenticateToken, updateProfile);

router.post('/admin/reset-user-password', authenticateToken, requireAdmin, adminResetUserPassword);

export default router;