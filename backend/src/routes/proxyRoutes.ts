import { Router, Request, Response } from 'express';
import { assertPublicHttpDestination, fetchWithSsrfProtection } from '../utils/publicDestination.js';
import { protect } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import rateLimit from 'express-rate-limit';

const router = Router();

/** Rate limiter for the general proxy — 60 requests per minute per IP */
const proxyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many proxy requests, please try again later' },
});

router.use(proxyLimiter);
router.use(protect);

const forwardedHeaderMap: Record<string, string> = {
    'x-referer': 'referer',
    'x-origin': 'origin',
    'x-user-agent': 'user-agent',
};

function buildForwardHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    Object.entries(req.headers).forEach(([key, value]) => {
        if (typeof value !== 'string') return;
        const lowerKey = key.toLowerCase();
        const forwardedKey = forwardedHeaderMap[lowerKey];
        if (forwardedKey) headers[forwardedKey] = value;
        else if (
            ![
                'host',
                'connection',
                'content-length',
                'accept-encoding',
                'x-forwarded-for',
                'x-forwarded-host',
                'x-forwarded-proto',
                'cookie',
                'x-cookie',
                'authorization',
            ].includes(lowerKey)
        ) {
            headers[lowerKey] = value;
        }
    });

    if (!headers['user-agent']) {
        headers['user-agent'] =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
    }

    return headers;
}

router.all('/', async (req: Request, res: Response): Promise<void> => {
    const rawDestination = req.query.destination;
    if (typeof rawDestination !== 'string') {
        res.status(400).json({ success: false, error: 'destination query parameter is required' });
        return;
    }

    let destination: URL;
    try {
        destination = await assertPublicHttpDestination(rawDestination);
    } catch {
        res.status(400).json({ success: false, error: 'Invalid or blocked destination' });
        return;
    }

    try {
        const method = req.method.toUpperCase();
        const response = await fetchWithSsrfProtection(destination, {
            method,
            headers: buildForwardHeaders(req),
            body: method === 'GET' || method === 'HEAD' ? undefined : (req.body as Buffer),
        });

        response.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                res.setHeader('x-set-cookie', value);
                return;
            }
            if (
                ![
                    'content-encoding',
                    'content-length',
                    'connection',
                    'transfer-encoding',
                ].includes(key.toLowerCase())
            ) {
                res.setHeader(key, value);
            }
        });
        res.setHeader('X-Final-Destination', response.url);
        res.status(response.status);

        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
    } catch {
        logger.warn(`Proxy request failed for destination: ${rawDestination}`);
        res.status(502).json({ success: false, error: 'Proxy request failed' });
    }
});

export default router;
