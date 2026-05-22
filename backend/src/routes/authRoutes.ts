import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
    register,
    login,
    logout,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    googleAuth,
    githubAuth
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

/** Rate limiter for login and register endpoints */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many authentication attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/** Stricter rate limiter for password reset requests */
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Too many password reset requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);

// Password reset routes (public)
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);

// OAuth routes (public)
router.post('/google', authLimiter, googleAuth);
router.post('/github', authLimiter, githubAuth);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

export default router;

