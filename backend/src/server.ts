import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import myListRoutes from './routes/myListRoutes.js';
import collectionsRoutes from './routes/collectionsRoutes.js';
import preferencesRoutes from './routes/preferencesRoutes.js';
import watchedEpisodeRoutes from './routes/watchedEpisodeRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any localhost origin
        if (origin.match(/^http:\/\/localhost:\d+$/) || origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/my-list', myListRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/watched-episodes', watchedEpisodeRoutes);

app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint not found' }));

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📚 API: /api/my-list, /api/collections, /api/preferences`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
