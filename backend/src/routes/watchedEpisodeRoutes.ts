import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getWatchedEpisodes, toggleWatchedEpisode } from '../controllers/watchedEpisodeController.js';

const router = express.Router();

router.use(protect);

router.get('/:tvShowId', getWatchedEpisodes);
router.post('/toggle', toggleWatchedEpisode);

export default router;
