import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { connectDB } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import myListRoutes from './routes/myListRoutes.js';
import collectionsRoutes from './routes/collectionsRoutes.js';
import preferencesRoutes from './routes/preferencesRoutes.js';
import watchedEpisodeRoutes from './routes/watchedEpisodeRoutes.js';
import tmdbRoutes from './routes/tmdbRoutes.js';
import { initializeSocketServer } from './sockets/watchParty.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins: string[] = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
    : ['http://localhost:5173'];

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
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/my-list', myListRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/watched-episodes', watchedEpisodeRoutes);
app.use('/api/tmdb', tmdbRoutes);

app.use((_req, res) => res.status(404).json({ success: false, error: 'Endpoint not found' }));

// Wrap Express in an HTTP server for Socket.io support
const httpServer = http.createServer(app);
initializeSocketServer(httpServer, allowedOrigins);

const startServer = async () => {
    try {
        await connectDB();
        if (process.env.NODE_ENV !== 'production') {
            httpServer.listen(PORT, () => {
                logger.info(`🚀 Server running on http://localhost:${PORT}`);
                logger.info(`📚 API: /api/my-list, /api/collections, /api/preferences`);
                logger.info(`🔌 WebSocket: Watch party sync enabled`);
            });
        }
    } catch (error) {
        logger.error('Failed to start server:', error);
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

startServer();

export default app;

