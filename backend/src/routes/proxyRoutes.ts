import { Router, Request, Response } from 'express';
import { assertPublicHttpDestination } from '../utils/publicDestination.js';

const router = Router();

const forwardedHeaderMap: Record<string, string> = {
    'x-cookie': 'cookie',
    'x-referer': 'referer',
    'x-origin': 'origin',
    'x-user-agent': 'user-agent',
    'x-x-real-ip': 'x-real-ip',
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
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid destination',
        });
        return;
    }

    try {
        const method = req.method.toUpperCase();
        const response = await fetch(destination, {
            method,
            headers: buildForwardHeaders(req),
            body: method === 'GET' || method === 'HEAD' ? undefined : (req.body as Buffer),
            redirect: 'follow',
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
    } catch (error) {
        res.status(502).json({
            success: false,
            error: error instanceof Error ? error.message : 'Proxy request failed',
        });
    }
});

export default router;
