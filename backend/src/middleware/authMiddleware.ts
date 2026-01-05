import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
            userId?: string;
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'cineflix-super-secret-jwt-key-2024';

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token: string | undefined;

        // Check for token in Authorization header
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

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
        console.error('Auth middleware error:', error);
        res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
};

// Optional auth - doesn't fail if no token, just attaches user if available
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token: string | undefined;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

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
