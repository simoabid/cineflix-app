import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connectDB = async (): Promise<void> => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }
        await mongoose.connect(mongoUri);
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

