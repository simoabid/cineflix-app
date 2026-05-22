import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** Structured JSON format for production, colorized CLI format for development */
const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

/** Rotated file transport — rotates daily, keeps 14 days, max 20MB per file */
const errorRotateTransport = new DailyRotateFile({
    dirname: LOG_DIR,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
});

const combinedRotateTransport = new DailyRotateFile({
    dirname: LOG_DIR,
    filename: 'combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
});

/**
 * Centralized Winston logger instance.
 * - Development: colorized console output
 * - Production: JSON console + rotated file transports
 */
export const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: IS_PRODUCTION ? prodFormat : devFormat,
    defaultMeta: { service: 'cineflix-api' },
    transports: [
        new winston.transports.Console(),
        ...(IS_PRODUCTION ? [errorRotateTransport, combinedRotateTransport] : []),
    ],
    exitOnError: false,
});

/** Stream adapter for Express morgan integration (future use) */
export const logStream = {
    write: (message: string): void => {
        logger.info(message.trim());
    },
};

export default logger;
