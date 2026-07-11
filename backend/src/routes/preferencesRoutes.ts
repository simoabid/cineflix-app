import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getPreferences, savePreferences } from '../controllers/preferencesController.js';

const router = Router();

// All preference routes require authentication
router.use(protect);

router.get('/', getPreferences);
router.put('/', savePreferences);

export default router;
