import { Router, Request, Response } from 'express';
import NodeCache from 'node-cache';
import { env } from '../config/env.js';

const router = Router();

/** Server-side cache for OMDb API responses. TTL = 7 days (ratings change infrequently). */
const omdbCache = new NodeCache({ stdTTL: 604800, checkperiod: 3600 });

const OMDB_BASE_URL = 'https://www.omdbapi.com';
const OMDB_API_KEY = env.OMDB_API_KEY;

/**
 * GET /api/omdb
 * Proxies requests to the OMDb API with server-side caching.
 * Keeps the OMDb API key secure on the server — never exposed to the client bundle.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    if (!OMDB_API_KEY) {
        res.status(503).json({ success: false, error: 'OMDb API is not configured' });
        return;
    }

    const cacheKey = JSON.stringify(req.query);
    const cachedData = omdbCache.get<unknown>(cacheKey);
    if (cachedData) {
        res.json(cachedData);
        return;
    }

    try {
        const queryParams = new URLSearchParams(req.query as Record<string, string>);
        queryParams.set('apikey', OMDB_API_KEY);

        const omdbUrl = `${OMDB_BASE_URL}/?${queryParams.toString()}`;
        const response = await fetch(omdbUrl);

        if (!response.ok) {
            res.status(response.status).json({ success: false, error: `OMDb API returned ${response.status}` });
            return;
        }

        const data: unknown = await response.json();
        omdbCache.set(cacheKey, data);
        res.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'OMDb proxy request failed';
        res.status(502).json({ success: false, error: message });
    }
});

export default router;
