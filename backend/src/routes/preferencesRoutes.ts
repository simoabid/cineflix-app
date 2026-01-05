import { Router } from 'express';
import { getPreferences, savePreferences } from '../controllers/preferencesController.js';

const router = Router();

router.get('/', getPreferences);
router.put('/', savePreferences);

export default router;
