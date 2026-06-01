import { Router, Request, Response } from 'express';
import { Readable } from 'stream';
import { assertPublicHttpDestination } from '../utils/publicDestination.js';

const router = Router();

type MediaProxyPayload = {
    type: 'hls' | 'mp4';
    url: string;
    headers?: Record<string, string>;
    options?: {
        depth?: 0 | 1 | 2;
    };
};

const blockedForwardHeaders = new Set([
    'host',
    'connection',
    'content-length',
    'accept-encoding',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
]);

function decodePayload(input: string): MediaProxyPayload {
    const json = Buffer.from(input, 'base64url').toString('utf-8');
    const parsed = JSON.parse(json) as MediaProxyPayload;
    if (
        !parsed ||
        (parsed.type !== 'hls' && parsed.type !== 'mp4') ||
        typeof parsed.url !== 'string'
    ) {
        throw new Error('Invalid media proxy payload');
    }
    return parsed;
}

function encodePayload(payload: MediaProxyPayload): string {
    return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

function buildProxyUrl(payload: MediaProxyPayload): string {
    return `/api/media-proxy?${new URLSearchParams({ payload: encodePayload(payload) })}`;
}

function buildForwardHeaders(payload: MediaProxyPayload, req: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    Object.entries(payload.headers ?? {}).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (!blockedForwardHeaders.has(lowerKey)) headers[lowerKey] = value;
    });

    const range = req.headers.range;
    if (typeof range === 'string') headers.range = range;

    if (!headers['user-agent']) {
        headers['user-agent'] =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
    }

    return headers;
}

function copyResponseHeaders(response: globalThis.Response, res: Response): void {
    response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (
            [
                'content-encoding',
                'connection',
                'transfer-encoding',
                'access-control-allow-origin',
            ].includes(lowerKey)
        ) {
            return;
        }
        res.setHeader(key, value);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
}

function isProbablyPlaylist(url: string, previousLine: string | null): boolean {
    if (previousLine?.startsWith('#EXT-X-STREAM-INF')) return true;
    try {
        return new URL(url).pathname.toLowerCase().endsWith('.m3u8');
    } catch {
        return url.toLowerCase().split('?')[0].endsWith('.m3u8');
    }
}

function rewriteUriAttribute(line: string, baseUrl: URL, payload: MediaProxyPayload): string {
    return line.replace(/URI="([^"]+)"/g, (_match, rawUri: string) => {
        const absoluteUrl = new URL(rawUri, baseUrl).toString();
        const proxied = buildProxyUrl({
            type: isProbablyPlaylist(absoluteUrl, null) ? 'hls' : 'mp4',
            url: absoluteUrl,
            headers: payload.headers,
            options: payload.options,
        });
        return `URI="${proxied}"`;
    });
}

function rewritePlaylist(playlist: string, baseUrl: URL, payload: MediaProxyPayload): string {
    const lines = playlist.split(/\r?\n/);
    let previousLine: string | null = null;

    return lines
        .map((line) => {
            const trimmed = line.trim();
            if (trimmed.length === 0) {
                previousLine = line;
                return line;
            }

            if (trimmed.startsWith('#')) {
                const rewritten = rewriteUriAttribute(line, baseUrl, payload);
                previousLine = trimmed;
                return rewritten;
            }

            const absoluteUrl = new URL(trimmed, baseUrl).toString();
            const proxied = buildProxyUrl({
                type: isProbablyPlaylist(absoluteUrl, previousLine) ? 'hls' : 'mp4',
                url: absoluteUrl,
                headers: payload.headers,
                options: payload.options,
            });
            previousLine = trimmed;
            return proxied;
        })
        .join('\n');
}

async function proxyHls(payload: MediaProxyPayload, req: Request, res: Response): Promise<void> {
    const destination = await assertPublicHttpDestination(payload.url);
    const response = await fetch(destination, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: buildForwardHeaders(payload, req),
        redirect: 'follow',
    });

    copyResponseHeaders(response, res);
    res.setHeader('content-type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.status(response.status);

    if (req.method === 'HEAD') {
        res.end();
        return;
    }

    const text = await response.text();
    res.send(rewritePlaylist(text, new URL(response.url), payload));
}

async function proxyFile(payload: MediaProxyPayload, req: Request, res: Response): Promise<void> {
    const destination = await assertPublicHttpDestination(payload.url);
    const response = await fetch(destination, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: buildForwardHeaders(payload, req),
        redirect: 'follow',
    });

    copyResponseHeaders(response, res);
    res.status(response.status);

    if (req.method === 'HEAD' || !response.body) {
        res.end();
        return;
    }

    Readable.fromWeb(response.body).pipe(res);
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
    const rawPayload = req.query.payload;
    if (typeof rawPayload !== 'string') {
        res.status(400).json({ success: false, error: 'payload query parameter is required' });
        return;
    }

    let payload: MediaProxyPayload;
    try {
        payload = decodePayload(rawPayload);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid media proxy payload',
        });
        return;
    }

    try {
        if (payload.type === 'hls') await proxyHls(payload, req, res);
        else await proxyFile(payload, req, res);
    } catch (error) {
        res.status(502).json({
            success: false,
            error: error instanceof Error ? error.message : 'Media proxy request failed',
        });
    }
});

router.head('/', async (req: Request, res: Response): Promise<void> => {
    const rawPayload = req.query.payload;
    if (typeof rawPayload !== 'string') {
        res.status(400).end();
        return;
    }

    try {
        const payload = decodePayload(rawPayload);
        if (payload.type === 'hls') await proxyHls(payload, req, res);
        else await proxyFile(payload, req, res);
    } catch {
        res.status(502).end();
    }
});

export default router;
