import { Router, Request, Response } from 'express';
import CryptoJS from 'crypto-js';
import { env } from '../config/env.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

/**
 * POST /api/vidrock/encrypt
 * Server-side encryption for Vidrock API — keeps the passphrase secure.
 * Accepts { itemId, itemType } and returns the encrypted URL path.
 */
router.post('/encrypt', (req: Request, res: Response): void => {
    const passphrase = env.VIDROCK_PASSPHRASE;
    if (!passphrase) {
        res.status(503).json({ success: false, error: 'Vidrock is not configured' });
        return;
    }

    const { itemId, itemType } = req.body as { itemId?: string; itemType?: string };
    if (!itemId || typeof itemId !== 'string' || !itemType || typeof itemType !== 'string') {
        res.status(400).json({ success: false, error: 'itemId and itemType are required' });
        return;
    }

    // Only allow known item types
    if (!['movie', 'tv'].includes(itemType)) {
        res.status(400).json({ success: false, error: 'Invalid itemType' });
        return;
    }

    try {
        const key = CryptoJS.enc.Utf8.parse(passphrase);
        const iv = CryptoJS.enc.Utf8.parse(passphrase.substring(0, 16));

        const encrypted = CryptoJS.AES.encrypt(itemId, key, {
            iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });

        let encryptedBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
        encryptedBase64 = encryptedBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const encodedPath = `${itemType}/${encodeURIComponent(encryptedBase64)}`;

        res.json({ success: true, data: { path: encodedPath } });
    } catch {
        res.status(500).json({ success: false, error: 'Encryption failed' });
    }
});

export default router;
