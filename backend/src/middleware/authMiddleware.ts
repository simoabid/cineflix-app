import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
            userId?: string;
        }
    }
}

const { JWT_SECRET } = env;

function extractToken(req: Request): string | undefined {
    // Prefer httpOnly cookie (web); accept Bearer for native mobile SecureStore sessions.
    if (req.cookies?.auth_token) {
        return req.cookies.auth_token as string;
    }
    const header = req.headers.authorization;
    if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
        const bearer = header.slice(7).trim();
        if (bearer.length > 0) return bearer;
    }
    return undefined;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ success: false, error: 'Not authorized, no token' });
            return;
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            res.status(401).json({ success: false, error: 'User not found' });
            return;
        }

        req.user = user;
        req.userId = user._id.toString();
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
};

// Optional auth - doesn't fail if no token, just attaches user if available
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = extractToken(req);

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
            const user = await User.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
                req.userId = user._id.toString();
            }
        }

        next();
    } catch (error) {
        // Token invalid, just continue without user
        next();
    }
};

export default { protect, optionalAuth };
