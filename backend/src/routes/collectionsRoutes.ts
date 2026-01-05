import { Router } from 'express';
import { getCollections, createCollection, updateCollection, deleteCollection, addItemToCollection, removeItemFromCollection } from '../controllers/collectionsController.js';

const router = Router();

router.get('/', getCollections);
router.post('/', createCollection);
router.post('/:id/items', addItemToCollection);
router.put('/:id', updateCollection);
router.delete('/:id', deleteCollection);
router.delete('/:id/items/:itemId', removeItemFromCollection);

export default router;
