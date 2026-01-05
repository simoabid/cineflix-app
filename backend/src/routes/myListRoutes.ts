import { Router } from 'express';
import { getMyList, addToList, removeFromList, updateItem, toggleLike, likeContent, unlikeContent, getStats, searchItems, bulkOperation, isInList, getLikedContent, getContinueWatching, getRecentlyAdded, getAllTags, updateProgress } from '../controllers/myListController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

router.get('/', getMyList);
router.get('/stats', getStats);
router.get('/search', searchItems);
router.get('/liked', getLikedContent);
router.get('/continue-watching', getContinueWatching);
router.get('/recent', getRecentlyAdded);
router.get('/tags', getAllTags);
router.get('/check/:contentId/:contentType', isInList);

router.post('/add', addToList);
router.post('/toggle-like', toggleLike);
router.post('/like', likeContent);
router.post('/unlike', unlikeContent);
router.post('/bulk', bulkOperation);
router.post('/progress', updateProgress);

router.put('/:id', updateItem);
router.delete('/:id', removeFromList);

export default router;
