import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import * as c from '../controllers/inventory.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',         requirePermission('inventory.view'),   c.listInventory);
router.get('/summary',  requirePermission('inventory.view'),   c.inventorySummary);
router.patch('/:productId', requirePermission('inventory.update'), validateBody(c.thresholdSchema), c.updateThresholds);
router.post('/recheck-alerts', requirePermission('alerts.manage'), c.recheckAlerts);

export default router;
