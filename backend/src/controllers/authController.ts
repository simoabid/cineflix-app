import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cineflix-super-secret-jwt-key-2024';
const JWT_EXPIRE = '30d';

// Generate JWT token
const generateToken = (id: string): string => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

/**
 * POST /api/auth/register
 * Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, avatar } = req.body;

        // Validate input
        if (!email || !password || !name) {
            res.status(400).json({ success: false, error: 'Please provide email, password, and name' });
            return;
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({ success: false, error: 'User with this email already exists' });
            return;
        }

        // Create user
        const user = await User.create({
            email: email.toLowerCase(),
            password,
            name,
            avatar: avatar || '' // Optional avatar
        });

        // Generate token
        const token = generateToken(user._id.toString());

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    createdAt: user.createdAt
                },
                token
            }
        });
    } catch (error: any) {
        console.error('Register error:', error);

        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            res.status(400).json({ success: false, error: messages.join(', ') });
            return;
        }

        res.status(500).json({ success: false, error: 'Failed to register user' });
    }
};

/**
 * POST /api/auth/login
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            res.status(400).json({ success: false, error: 'Please provide email and password' });
            return;
        }

        // Find user with password
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }

        // Check password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }

        // Generate token
        const token = generateToken(user._id.toString());

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    createdAt: user.createdAt
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Failed to login' });
    }
};

/**
 * GET /api/auth/me
 * Get current user
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: req.user._id,
                    email: req.user.email,
                    name: req.user.name,
                    avatar: req.user.avatar,
                    createdAt: req.user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, error: 'Failed to get user' });
    }
};

/**
 * PUT /api/auth/profile
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const { name, avatar } = req.body;
        const updates: any = {};

        if (name) updates.name = name;
        if (avatar !== undefined) updates.avatar = avatar;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};

/**
 * PUT /api/auth/password
 * Change password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, error: 'Please provide current and new password' });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
            return;
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            res.status(401).json({ success: false, error: 'Current password is incorrect' });
            return;
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
};

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 * 
 * STUB: Implement email sending with token generation
 * Security notes:
 * - Generate cryptographically secure token
 * - Store hashed token with expiration (1 hour recommended)
 * - Send reset link via email, never expose token in logs
 * - Implement rate limiting (max 3 requests per hour per email)
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ success: false, error: 'Email is required' });
            return;
        }

        // STUB: In production, implement:
        // 1. Check if user exists (don't reveal if email exists or not)
        // 2. Generate secure reset token
        // 3. Store hashed token with expiration
        // 4. Send email with reset link

        // Always return success to prevent email enumeration
        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: 'Failed to process request' });
    }
};

/**
 * POST /api/auth/reset-password
 * Reset password with token
 * 
 * STUB: Implement token verification and password reset
 * Security notes:
 * - Validate token exists and hasn't expired
 * - Compare hashed token
 * - Hash new password with bcrypt/Argon2
 * - Invalidate token after use
 * - Optionally invalidate all existing sessions
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            res.status(400).json({ success: false, error: 'Token and new password are required' });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
            return;
        }

        // STUB: In production, implement:
        // 1. Find user by hashed token
        // 2. Verify token hasn't expired
        // 3. Hash new password
        // 4. Update user password
        // 5. Delete reset token
        // 6. Optionally send confirmation email

        res.status(501).json({
            success: false,
            error: 'Password reset not yet implemented. Please contact support.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
};

/**
 * POST /api/auth/google
 * OAuth callback for Google
 * 
 * STUB: Implement Google OAuth flow
 * Required setup:
 * - Create OAuth app at https://console.cloud.google.com
 * - Configure OAuth consent screen
 * - Add client ID and secret to environment variables
 * - Implement passport-google-oauth20 or similar
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    // STUB: In production, implement:
    // 1. Verify Google OAuth token
    // 2. Extract user info from Google
    // 3. Find or create user in database
    // 4. Generate JWT token
    // 5. Return user data and token

    res.status(501).json({
        success: false,
        error: 'Google OAuth not configured. See AUTH_INTEGRATION.md for setup instructions.',
        setupRequired: {
            env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
            callbackUrl: '/api/auth/google/callback'
        }
    });
};

/**
 * POST /api/auth/github
 * OAuth callback for GitHub
 * 
 * STUB: Implement GitHub OAuth flow
 * Required setup:
 * - Create OAuth app at https://github.com/settings/developers
 * - Add client ID and secret to environment variables
 * - Implement passport-github2 or similar
 */
export const githubAuth = async (req: Request, res: Response): Promise<void> => {
    // STUB: In production, implement:
    // 1. Exchange code for access token
    // 2. Fetch user info from GitHub API
    // 3. Find or create user in database
    // 4. Generate JWT token
    // 5. Return user data and token

    res.status(501).json({
        success: false,
        error: 'GitHub OAuth not configured. See AUTH_INTEGRATION.md for setup instructions.',
        setupRequired: {
            env: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
            callbackUrl: '/api/auth/github/callback'
        }
    });
};
