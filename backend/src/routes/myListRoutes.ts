import { Router } from 'express';
import { getMyList, addToList, removeFromList, updateItem, toggleLike, likeContent, unlikeContent, getStats, searchItems, bulkOperation, isInList, getLikedContent, getContinueWatching, getRecentlyAdded, getAllTags, updateProgress } from '../controllers/myListController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: WatchList
 *     description: User's personal watchlist management
 */

// Apply auth middleware to all routes
router.use(protect);

/**
 * @swagger
 * /my-list:
 *   get:
 *     summary: Get user's watchlist
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Watchlist items.
 */
router.get('/', getMyList);

/** @swagger
 * /my-list/stats:
 *   get:
 *     summary: Get watchlist statistics
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Watchlist stats (counts, genres, etc.).
 */
router.get('/stats', getStats);

/** @swagger
 * /my-list/search:
 *   get:
 *     summary: Search within user's watchlist
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Matching watchlist items.
 */
router.get('/search', searchItems);

/** @swagger
 * /my-list/liked:
 *   get:
 *     summary: Get liked content
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: List of liked items.
 */
router.get('/liked', getLikedContent);

/** @swagger
 * /my-list/continue-watching:
 *   get:
 *     summary: Get continue watching list
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Items with watch progress.
 */
router.get('/continue-watching', getContinueWatching);

/** @swagger
 * /my-list/recent:
 *   get:
 *     summary: Get recently added items
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Recently added items.
 */
router.get('/recent', getRecentlyAdded);

/** @swagger
 * /my-list/tags:
 *   get:
 *     summary: Get all user tags
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of all user-defined tags.
 */
router.get('/tags', getAllTags);

/** @swagger
 * /my-list/check/{contentId}/{contentType}:
 *   get:
 *     summary: Check if content is in the watchlist
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: contentType
 *         required: true
 *         schema: { type: string, enum: [movie, tv] }
 *     responses:
 *       200:
 *         description: Whether the item is in the list.
 */
router.get('/check/:contentId/:contentType', isInList);

/** @swagger
 * /my-list/add:
 *   post:
 *     summary: Add item to watchlist
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentId, contentType, title]
 *             properties:
 *               contentId: { type: number }
 *               contentType: { type: string, enum: [movie, tv] }
 *               title: { type: string }
 *               posterPath: { type: string }
 *     responses:
 *       201:
 *         description: Item added.
 */
router.post('/add', addToList);

/** @swagger
 * /my-list/toggle-like:
 *   post:
 *     summary: Toggle like status on a watchlist item
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentId, contentType]
 *             properties:
 *               contentId: { type: number }
 *               contentType: { type: string, enum: [movie, tv] }
 *     responses:
 *       200:
 *         description: Like toggled.
 */
router.post('/toggle-like', toggleLike);
router.post('/like', likeContent);
router.post('/unlike', unlikeContent);

/** @swagger
 * /my-list/bulk:
 *   post:
 *     summary: Perform bulk operations on watchlist items
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, itemIds]
 *             properties:
 *               type: { type: string, enum: [markWatched, markUnwatched, remove, setPriority, addTags] }
 *               itemIds: { type: array, items: { type: string } }
 *               payload: {}
 *     responses:
 *       200:
 *         description: Bulk operation completed.
 */
router.post('/bulk', bulkOperation);
router.post('/progress', updateProgress);

/** @swagger
 * /my-list/{id}:
 *   put:
 *     summary: Update a watchlist item
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item updated.
 *   delete:
 *     summary: Remove item from watchlist
 *     tags: [WatchList]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item removed.
 */
router.put('/:id', updateItem);
router.delete('/:id', removeFromList);

export default router;
