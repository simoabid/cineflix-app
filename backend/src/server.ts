import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { connectDB } from './config/database.js';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import authRoutes from './routes/authRoutes.js';
import myListRoutes from './routes/myListRoutes.js';
import collectionsRoutes from './routes/collectionsRoutes.js';
import preferencesRoutes from './routes/preferencesRoutes.js';
import watchedEpisodeRoutes from './routes/watchedEpisodeRoutes.js';
import tmdbRoutes from './routes/tmdbRoutes.js';
import omdbRoutes from './routes/omdbRoutes.js';
import vidrockRoutes from './routes/vidrockRoutes.js';
import proxyRoutes from './routes/proxyRoutes.js';
import mediaProxyRoutes from './routes/mediaProxyRoutes.js';
import { initializeSocketServer } from './sockets/watchParty.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = env.PORT;

const allowedOrigins: string[] = env.CORS_ALLOWED_ORIGINS.split(',').map((o: string) => o.trim());

// M1: Security headers via helmet with a CSP that whitelists streaming embed origins
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https://image.tmdb.org', 'https://*.tmdb.org', 'blob:'],
            connectSrc: ["'self'", 'https://api.themoviedb.org', 'https://www.omdbapi.com'],
            frameSrc: ["'self'", 'https://rivestream.live', 'https://embed.smashystream.com', 'https://vidjoy.pro'],
            frameAncestors: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Required for streaming iframes
    hsts: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
    },
}));

app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS policy'));
        }
    },
    credentials: true
}));

// M2: Global rate limiter — 200 requests per minute per IP across all endpoints
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

app.use('/api/proxy', express.raw({ type: '*/*', limit: '10mb' }), proxyRoutes);
app.use('/api/media-proxy', mediaProxyRoutes);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/my-list', myListRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/watched-episodes', watchedEpisodeRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/omdb', omdbRoutes);
app.use('/api/vidrock', vidrockRoutes);

// M5: Swagger API documentation — only available in non-production environments
if (env.NODE_ENV !== 'production') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'CineFlix API Docs',
        customCss: '.swagger-ui .topbar { display: none }',
    }));
    app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
}

app.use((_req, res) => res.status(404).json({ success: false, error: 'Endpoint not found' }));


// Wrap Express in an HTTP server for Socket.io support
const httpServer = http.createServer(app);
initializeSocketServer(httpServer, allowedOrigins);

const startServer = async () => {
    try {
        await connectDB();
        httpServer.listen(PORT, () => {
            logger.info(`🚀 Server running on http://localhost:${PORT}`);
            logger.info(`📚 API: /api/my-list, /api/collections, /api/preferences`);
            logger.info(`🔌 WebSocket: Watch party sync enabled`);
            if (env.NODE_ENV !== 'production') {
                logger.info(`📖 Docs: http://localhost:${PORT}/api/docs`);
            }
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
