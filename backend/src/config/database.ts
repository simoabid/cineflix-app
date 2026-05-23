import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(env.MONGODB_URI);
        logger.info('✅ Connected to MongoDB');
        mongoose.connection.on('error', (err) => {
            logger.error('❌ MongoDB connection error:', err);
        });
        mongoose.connection.on('disconnected', () => {
            logger.warn('⚠️ MongoDB disconnected');
        });
    } catch (error) {
        logger.error('❌ Database connection failed:', error);
    }
};

export default connectDB;

