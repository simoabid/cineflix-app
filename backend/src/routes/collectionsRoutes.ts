import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getCollections, createCollection, updateCollection, deleteCollection, addItemToCollection, removeItemFromCollection } from '../controllers/collectionsController.js';

const router = Router();

// All collection routes require authentication
router.use(protect);

router.get('/', getCollections);
router.post('/', createCollection);
router.post('/:id/items', addItemToCollection);
router.put('/:id', updateCollection);
router.delete('/:id', deleteCollection);
router.delete('/:id/items/:itemId', removeItemFromCollection);

export default router;
