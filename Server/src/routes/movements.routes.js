import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import * as c from '../controllers/movements.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',        requirePermission('movements.view'),   c.listMovements);
router.get('/summary', requirePermission('movements.view'),   c.movementSummary);
router.post('/',       requirePermission('movements.create'), validateBody(c.movementSchema), c.createMovement);

export default router;
