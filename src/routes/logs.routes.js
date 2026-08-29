import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { listLogs } from '../controllers/logs.controller.js';

const router = Router();
router.get('/', authenticate, requirePermission('logs.view'), listLogs);
export default router;
