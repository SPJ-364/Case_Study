import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import * as c from '../controllers/alerts.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',        requirePermission('alerts.view'),   c.listAlerts);
router.get('/summary', requirePermission('alerts.view'),   c.alertSummary);
router.patch('/:id',   requirePermission('alerts.manage'), validateBody(c.alertStatusSchema), c.updateAlertStatus);

export default router;
