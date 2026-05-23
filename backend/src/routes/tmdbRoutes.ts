import { Router, Request, Response } from 'express';
import NodeCache from 'node-cache';
import { env } from '../config/env.js';

const router = Router();

/** Server-side cache for TMDB API responses. TTL = 10 minutes. */
const tmdbCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const { TMDB_API_KEY } = env;

/**
 * GET /api/tmdb/*
 * Proxies requests to the TMDB API with server-side caching.
 * Keeps the TMDB API key secure on the server — never exposed to the client bundle.
 */
router.get('/*', async (req: Request, res: Response): Promise<void> => {
    const path = req.params[0];
    if (!path) {
        res.status(400).json({ success: false, error: 'TMDB API path is required' });
        return;
    }

    const cacheKey = req.originalUrl;
    const cachedData = tmdbCache.get<unknown>(cacheKey);
    if (cachedData) {
        res.json(cachedData);
        return;
    }

    try {
        // Build query params, forwarding client query params and adding the API key
        const queryParams = new URLSearchParams(req.query as Record<string, string>);
        queryParams.set('api_key', TMDB_API_KEY);

        const tmdbUrl = `${TMDB_BASE_URL}/${path}?${queryParams.toString()}`;
        const response = await fetch(tmdbUrl);

        if (!response.ok) {
            res.status(response.status).json({ success: false, error: `TMDB API returned ${response.status}` });
            return;
        }

        const data: unknown = await response.json();
        tmdbCache.set(cacheKey, data);
        res.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'TMDB proxy request failed';
        res.status(502).json({ success: false, error: message });
    }
});

/** GET /api/tmdb-stats — Cache statistics for monitoring */
router.get('/tmdb-stats', (_req: Request, res: Response): void => {
    const stats = tmdbCache.getStats();
    res.json({
        success: true,
        data: {
            keys: tmdbCache.keys().length,
            hits: stats.hits,
            misses: stats.misses,
            hitRate: stats.hits + stats.misses > 0
                ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
                : 0,
        },
    });
});

export default router;
