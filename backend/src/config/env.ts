/**
 * Centralized environment variable validation.
 * Import this module early (before any route/controller) to ensure
 * all required variables are present at startup.
 *
 * dotenv.config() is called here (not in server.ts) because ES module
 * imports are hoisted — this module would otherwise execute before
 * dotenv had a chance to load the .env file.
 */

import dotenv from 'dotenv';
dotenv.config();

const required = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

export const env = {
    JWT_SECRET: required('JWT_SECRET'),
    MONGODB_URI: required('MONGODB_URI'),
    TMDB_API_KEY: required('TMDB_API_KEY'),
    PORT: Number(process.env.PORT) || 3001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
} as const;
