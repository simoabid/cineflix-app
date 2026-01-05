import { Request, Response } from 'express';
import MyList, { IMyListItem } from '../models/MyList.js';
import mongoose from 'mongoose';

const calculateRuntime = (content: any, contentType: 'movie' | 'tv'): number => {
    if (contentType === 'movie') return content.runtime || 120;
    const episodeRuntime = (content.episode_run_time?.[0]) || 45;
    const episodes = content.number_of_episodes || 20;
    return episodeRuntime * episodes;
};

function formatItem(item: IMyListItem) {
    return {
        id: item._id.toString(),
        contentId: item.contentId,
        contentType: item.contentType,
        content: item.content,
        dateAdded: item.dateAdded.toISOString(),
        lastWatched: item.lastWatched?.toISOString(),
        status: item.status,
        progress: item.progress,
        playbackPosition: item.playbackPosition,
        duration: item.duration,
        lastEpisode: item.lastEpisode,
        personalRating: item.personalRating,
        personalNotes: item.personalNotes,
        priority: item.priority,
        customTags: item.customTags,
        estimatedRuntime: item.estimatedRuntime,
        isInContinueWatching: item.isInContinueWatching,
        isLiked: item.isLiked,
        likedAt: item.likedAt?.toISOString(),
    };
}

export const getMyList = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await MyList.find({ userId: req.userId }).sort({ dateAdded: -1 });
        res.json({ success: true, data: items.map(formatItem) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get list' });
    }
};

export const addToList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { content, contentType } = req.body;
        const userId = req.userId; // Use authenticated user ID

        if (!content || !contentType) {
            res.status(400).json({ success: false, error: 'Content and contentType are required' });
            return;
        }

        const existing = await MyList.findOne({ userId, contentId: content.id, contentType });
        if (existing) {
            res.json({ success: true, item: formatItem(existing), message: 'Already in list' });
            return;
        }

        const newItem = await MyList.create({
            userId, contentId: content.id, contentType, content,
            dateAdded: new Date(), status: 'notStarted', progress: 0, priority: 'medium',
            playbackPosition: 0, duration: 0,
            customTags: [], estimatedRuntime: calculateRuntime(content, contentType),
            isInContinueWatching: false, isLiked: false,
        });
        res.status(201).json({ success: true, item: formatItem(newItem) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to add to list' });
    }
};

export const removeFromList = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await MyList.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!result) { res.status(404).json({ success: false, error: 'Item not found' }); return; }
        res.json({ success: true, message: 'Item removed' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to remove from list' });
    }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const updates = req.body;
        delete updates._id; delete updates.userId;
        const item = await MyList.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { $set: updates }, { new: true }
        );
        if (!item) { res.status(404).json({ success: false, error: 'Item not found' }); return; }
        res.json({ success: true, item: formatItem(item) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update item' });
    }
};

export const updateProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const { contentId, contentType, progress, playbackPosition, duration, seasonNumber, episodeNumber } = req.body;
        const userId = req.userId;

        let item = await MyList.findOne({ userId, contentId, contentType });

        const status = progress >= 100 ? 'completed' : progress > 0 ? 'inProgress' : 'notStarted';
        const lastEpisode = (seasonNumber !== undefined && episodeNumber !== undefined)
            ? { seasonNumber, episodeNumber }
            : undefined;

        if (item) {
            // Update existing item
            item.progress = progress;
            item.playbackPosition = playbackPosition;
            item.duration = duration;
            item.lastWatched = new Date();
            item.status = status === 'completed' ? 'completed' : item.status === 'dropped' ? 'dropped' : status;
            if (lastEpisode) item.lastEpisode = lastEpisode;

            await item.save();
        } else {
            // Create new item if not exists (auto-add to list on watch)
            const { content } = req.body; // Ensure content is passed if creating
            if (!content) {
                // Try to fetch content or error if strictly required. 
                // For now, assume frontend sends content on first progress update if not in list.
                res.status(404).json({ success: false, error: 'Item not in list and no content provided' });
                return;
            }

            item = await MyList.create({
                userId, contentId, contentType, content,
                dateAdded: new Date(),
                status,
                progress,
                playbackPosition,
                duration,
                lastWatched: new Date(),
                lastEpisode,
                priority: 'medium',
                customTags: [],
                estimatedRuntime: calculateRuntime(content, contentType),
                isInContinueWatching: false,
                isLiked: false
            });
        }
        res.json({ success: true, item: formatItem(item) });
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ success: false, error: 'Failed to update progress' });
    }
};

export const toggleLike = async (req: Request, res: Response): Promise<void> => {
    try {
        const { contentId, contentType } = req.body;
        const item = await MyList.findOne({ userId: req.userId, contentId, contentType });
        if (!item) { res.json({ success: true, isLiked: false }); return; }
        item.isLiked = !item.isLiked;
        item.likedAt = item.isLiked ? new Date() : undefined;
        await item.save();
        res.json({ success: true, isLiked: item.isLiked });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to toggle like' });
    }
};

export const likeContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { content, contentType } = req.body;
        const userId = req.userId;
        let item = await MyList.findOne({ userId, contentId: content.id, contentType });
        if (item) {
            item.isLiked = true; item.likedAt = new Date(); await item.save();
        } else {
            item = await MyList.create({
                userId, contentId: content.id, contentType, content,
                dateAdded: new Date(), status: 'notStarted', progress: 0, priority: 'medium',
                customTags: [], estimatedRuntime: calculateRuntime(content, contentType),
                isInContinueWatching: false, isLiked: true, likedAt: new Date(),
            });
        }
        res.json({ success: true, item: formatItem(item) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to like content' });
    }
};

export const unlikeContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { contentId, contentType } = req.body;
        const item = await MyList.findOne({ userId: req.userId, contentId, contentType });
        if (item) { item.isLiked = false; item.likedAt = undefined; await item.save(); }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to unlike content' });
    }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await MyList.find({ userId: req.userId });
        const totalItems = items.length;
        const totalMovies = items.filter(i => i.contentType === 'movie').length;
        const totalTVShows = items.filter(i => i.contentType === 'tv').length;
        const totalHours = Math.round(items.reduce((s, i) => s + (i.estimatedRuntime || 0), 0) / 60);
        const completedItems = items.filter(i => i.status === 'completed').length;
        const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        res.json({ success: true, data: { totalItems, totalMovies, totalTVShows, totalHours, completionRate, averageRating: 0, genreDistribution: {}, statusDistribution: { notStarted: items.filter(i => i.status === 'notStarted').length, inProgress: items.filter(i => i.status === 'inProgress').length, completed: completedItems, dropped: items.filter(i => i.status === 'dropped').length }, monthlyAdditions: {} } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
};

export const searchItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string') { res.status(400).json({ success: false, error: 'Query required' }); return; }
        const items = await MyList.find({ userId: req.userId });
        const q = query.toLowerCase();
        const filtered = items.filter(i => (i.content?.title || i.content?.name || '').toLowerCase().includes(q));
        res.json({ success: true, data: filtered.map(formatItem) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to search' });
    }
};

export const bulkOperation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, itemIds } = req.body;
        const userId = req.userId;
        const objectIds = itemIds.map((id: string) => new mongoose.Types.ObjectId(id));
        if (type === 'remove') await MyList.deleteMany({ _id: { $in: objectIds }, userId });
        else if (type === 'markWatched') await MyList.updateMany({ _id: { $in: objectIds }, userId }, { $set: { status: 'completed', progress: 100 } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Bulk operation failed' });
    }
};

export const isInList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { contentId, contentType } = req.params;
        const item = await MyList.findOne({ userId: req.userId, contentId: parseInt(contentId), contentType });
        res.json({ success: true, inList: !!item, isLiked: item?.isLiked || false });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to check list' });
    }
};

export const getLikedContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await MyList.find({ userId: req.userId, isLiked: true }).sort({ likedAt: -1 });
        res.json({ success: true, data: items.map(formatItem) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get liked content' });
    }
};

export const getContinueWatching = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await MyList.find({ userId: req.userId, status: 'inProgress', progress: { $gt: 0, $lt: 100 } }).sort({ lastWatched: -1 }).limit(10);
        res.json({ success: true, data: items.map(formatItem) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get continue watching' });
    }
};

export const getRecentlyAdded = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const items = await MyList.find({ userId: req.userId }).sort({ dateAdded: -1 }).limit(limit);
        res.json({ success: true, data: items.map(formatItem) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get recent' });
    }
};

export const getAllTags = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await MyList.find({ userId: req.userId });
        const allTags = [...new Set(items.flatMap(i => i.customTags || []))].sort();
        res.json({ success: true, data: allTags });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get tags' });
    }
};
