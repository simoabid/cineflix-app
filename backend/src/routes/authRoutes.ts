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

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication and user management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: User created successfully. Auth cookie set.
 *       400:
 *         description: Validation error or user already exists.
 *       429:
 *         description: Rate limit exceeded.
 */
router.post('/register', authLimiter, register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful. Auth cookie set.
 *       401:
 *         description: Invalid credentials.
 *       429:
 *         description: Rate limit exceeded.
 */
router.post('/login', authLimiter, login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out and clear auth cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully.
 */
router.post('/logout', logout);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Reset email sent (if account exists).
 *       429:
 *         description: Rate limit exceeded.
 */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *       400:
 *         description: Invalid or expired token.
 */
router.post('/reset-password', passwordResetLimiter, resetPassword);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Authenticate with Google OAuth
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential: { type: string, description: Google ID token }
 *     responses:
 *       200:
 *         description: Authenticated successfully.
 */
router.post('/google', authLimiter, googleAuth);

/**
 * @swagger
 * /auth/github:
 *   post:
 *     summary: Authenticate with GitHub OAuth
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, description: GitHub OAuth authorization code }
 *     responses:
 *       200:
 *         description: Authenticated successfully.
 */
router.post('/github', authLimiter, githubAuth);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated.
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               avatar: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated.
 *       401:
 *         description: Not authenticated.
 */
router.put('/profile', protect, updateProfile);

/**
 * @swagger
 * /auth/password:
 *   put:
 *     summary: Change password (requires current password)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password changed.
 *       400:
 *         description: Current password incorrect.
 *       401:
 *         description: Not authenticated.
 */
router.put('/password', protect, changePassword);

export default router;

