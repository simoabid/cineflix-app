import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { IUser } from '../models/User.js';
import { env } from '../config/env.js';
import { UpdateProfileRequestBody } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface GoogleUserPayload {
    sub: string;
    email: string;
    email_verified: boolean | string;
    name?: string;
    picture?: string;
    aud?: string;
}

function isValidGooglePayload(payload: unknown): payload is GoogleUserPayload {
    if (typeof payload !== 'object' || payload === null) {
        return false;
    }
    const p = payload as Record<string, unknown>;
    return (
        typeof p.sub === 'string' &&
        typeof p.email === 'string' &&
        (typeof p.email_verified === 'boolean' || typeof p.email_verified === 'string')
    );
}

const { JWT_SECRET } = env;
const JWT_EXPIRE = '30d';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Generate JWT token */
const generateToken = (id: string): string => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

/** Build the auth cookie options for httpOnly secure cookies */
const buildCookieOptions = (): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
    path: string;
} => ({
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
});

/**
 * Send token response with httpOnly cookie (web) and token in body (native mobile).
 * Web should prefer the cookie and avoid persisting the body token in localStorage.
 * Mobile stores the body token in OS SecureStore (not plain AsyncStorage).
 */
const sendTokenResponse = (user: IUser, statusCode: number, res: Response): void => {
    const token = generateToken(user._id.toString());
    res.status(statusCode)
        .cookie('auth_token', token, buildCookieOptions())
        .json({
            success: true,
            // Top-level token for mobile clients that read ApiResponse.token
            token,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    createdAt: user.createdAt,
                },
                // Nested for clients that only read data.token
                token,
            },
        });
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

        // Enforce password complexity: 8+ chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
        const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
            res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
            });
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
            avatar: avatar || ''
        });

        sendTokenResponse(user, 201, res);
    } catch (error: unknown) {
        logger.error('Register error:', error);

        // Handle mongoose validation errors
        if (error instanceof Error && error.name === 'ValidationError') {
            const validationError = error as unknown as { errors: Record<string, { message: string }> };
            const messages = Object.values(validationError.errors).map((err) => err.message);
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

        sendTokenResponse(user, 200, res);
    } catch (error) {
        logger.error('Login error:', error);
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
        logger.error('Get me error:', error);
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

        const { name, avatar }: UpdateProfileRequestBody = req.body;
        const updates: Partial<Pick<IUser, 'name' | 'avatar'>> = {};

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
        logger.error('Update profile error:', error);
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

        const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!PASSWORD_COMPLEXITY_REGEX.test(newPassword)) {
            res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
            });
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
        logger.error('Change password error:', error);
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
};

/**
 * POST /api/auth/logout
 * Logout user — clears the httpOnly auth cookie
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
    });
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
        logger.error('Forgot password error:', error);
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

        const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!PASSWORD_COMPLEXITY_REGEX.test(newPassword)) {
            res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
            });
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
        logger.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
};

/**
 * POST /api/auth/google
 * Authenticate user with Google OAuth (supports both ID Token and Access Token)
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        // C3: Mandatory configuration check
        if (!env.GOOGLE_CLIENT_ID) {
            logger.error('Google OAuth: GOOGLE_CLIENT_ID not configured');
            res.status(503).json({ success: false, error: 'Google authentication is not configured on this server' });
            return;
        }

        const { credential, token, type } = req.body;
        const googleToken = credential || token;
        const isAccessToken = type === 'access_token';

        if (!googleToken) {
            res.status(400).json({ success: false, error: 'Google token is required' });
            return;
        }

        let email = '';
        let name = '';
        let avatar = '';
        let googleId = '';

        if (isAccessToken) {
            // Verify access token by calling Google Userinfo API
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${googleToken}` }
            });

            if (!response.ok) {
                logger.error(`Google Access Token verification failed. Status: ${response.status}`);
                res.status(400).json({ success: false, error: 'Invalid Google access token' });
                return;
            }

            const payload: unknown = await response.json();
            
            // H1: Runtime validation
            if (!isValidGooglePayload(payload)) {
                logger.error('Google Access Token response failed type validation');
                res.status(400).json({ success: false, error: 'Invalid payload structure received from Google' });
                return;
            }

            // C2: Email verification check
            const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true';
            if (!isEmailVerified) {
                logger.warn(`Google login attempt with unverified email: ${payload.email}`);
                res.status(400).json({ success: false, error: 'Google account email is not verified' });
                return;
            }

            email = payload.email;
            name = payload.name || '';
            avatar = payload.picture || '';
            googleId = payload.sub;
        } else {
            // Verify ID Token by calling Google Tokeninfo API
            const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`);

            if (!response.ok) {
                logger.error(`Google ID Token verification failed. Status: ${response.status}`);
                res.status(400).json({ success: false, error: 'Invalid Google ID token' });
                return;
            }

            const payload: unknown = await response.json();

            // H1: Runtime validation
            if (!isValidGooglePayload(payload)) {
                logger.error('Google ID Token response failed type validation');
                res.status(400).json({ success: false, error: 'Invalid payload structure received from Google' });
                return;
            }

            // C3: Unconditional audience verification for ID tokens
            if (payload.aud !== env.GOOGLE_CLIENT_ID) {
                logger.warn(`Google token audience mismatch. Expected: ${env.GOOGLE_CLIENT_ID}, Got: ${payload.aud}`);
                res.status(400).json({ success: false, error: 'Google token security verification failed' });
                return;
            }

            // C2: Email verification check
            const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true';
            if (!isEmailVerified) {
                logger.warn(`Google login attempt with unverified email: ${payload.email}`);
                res.status(400).json({ success: false, error: 'Google account email is not verified' });
                return;
            }

            email = payload.email;
            name = payload.name || '';
            avatar = payload.picture || '';
            googleId = payload.sub;
        }

        if (!email || !googleId) {
            res.status(400).json({ success: false, error: 'Failed to retrieve user profile from Google' });
            return;
        }

        let user;
        try {
            // 1. Look up user by googleId
            user = await User.findOne({ googleId });

            if (!user) {
                // 2. Fallback: look up user by email
                user = await User.findOne({ email: email.toLowerCase() });

                if (user) {
                    // Link Google account to existing user
                    user.googleId = googleId;
                    if (!user.avatar && avatar) {
                        user.avatar = avatar;
                    }
                    await user.save();
                    logger.info(`Linked Google account for user: ${email}`);
                } else {
                    // 3. Create new user (password is optional for Google OAuth accounts)
                    user = await User.create({
                        email: email.toLowerCase(),
                        name: name || email.split('@')[0],
                        avatar: avatar || '',
                        googleId
                    });
                    logger.info(`Created new user via Google Sign-In: ${email}`);
                }
            } else {
                // Update profile avatar if not set
                if (!user.avatar && avatar) {
                    user.avatar = avatar;
                    await user.save();
                }
                logger.info(`Logged in user via Google: ${email}`);
            }
        } catch (dbError: any) {
            // H2: Handle duplicate key race conditions during creation/linking
            if (dbError && dbError.code === 11000) {
                logger.warn(`Conflict (duplicate key) during Google login for: ${email}. Retrying lookup.`);
                user = await User.findOne({ googleId });
                if (!user) {
                    user = await User.findOne({ email: email.toLowerCase() });
                }
                if (!user) {
                    res.status(500).json({ success: false, error: 'Conflict occurred during database login' });
                    return;
                }
            } else {
                throw dbError; // Rethrow other database exceptions to main catch
            }
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        logger.error('Google Auth Error:', error);
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
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
