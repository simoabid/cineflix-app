import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from './routes/authRoutes';
import myListRoutes from './routes/myListRoutes';
import collectionsRoutes from './routes/collectionsRoutes';
import preferencesRoutes from './routes/preferencesRoutes';
import watchedEpisodeRoutes from './routes/watchedEpisodeRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: true,
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
        if (process.env.NODE_ENV !== 'production') {
            app.listen(PORT, () => {
                console.log(`🚀 Server running on http://localhost:${PORT}`);
                console.log(`📚 API: /api/my-list, /api/collections, /api/preferences`);
            });
        }
    } catch (error) {
        console.error('Failed to start server:', error);
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

startServer();

export default app;
