import { Request, Response } from 'express';
import WatchedEpisode from '../models/WatchedEpisode.js';

export const getWatchedEpisodes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tvShowId } = req.params;

        if (!tvShowId) {
            res.status(400).json({ success: false, error: 'TV Show ID is required' });
            return;
        }

        const watchedEpisodes = await WatchedEpisode.find({
            userId: req.userId,
            tvShowId: parseInt(tvShowId)
        });

        // Return simpler format: array of "season-episode" strings or objects
        const formatted = watchedEpisodes.map(ep => ({
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
            watchedAt: ep.watchedAt
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Error fetching watched episodes:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch watched episodes' });
    }
};

export const toggleWatchedEpisode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tvShowId, seasonNumber, episodeNumber } = req.body;
        const userId = req.userId;

        if (!tvShowId || seasonNumber === undefined || episodeNumber === undefined) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return;
        }

        const query = {
            userId,
            tvShowId,
            seasonNumber,
            episodeNumber
        };

        const existing = await WatchedEpisode.findOne(query);

        if (existing) {
            // If it exists, remove it (toggle off)
            await WatchedEpisode.deleteOne({ _id: existing._id });
            res.json({ success: true, watched: false });
        } else {
            // If it doesn't exist, create it (toggle on)
            await WatchedEpisode.create(query);
            res.json({ success: true, watched: true });
        }
    } catch (error) {
        console.error('Error toggling watched episode:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle watched status' });
    }
};
