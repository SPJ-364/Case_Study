import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import * as c from '../controllers/users.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',        requirePermission('users.view'),   c.listUsers);
router.get('/:id',     requirePermission('users.view'),   c.getUser);
router.post('/',       requirePermission('users.manage'), validateBody(c.createUserSchema), c.createUser);
router.patch('/:id',   requirePermission('users.manage'), validateBody(c.updateUserSchema), c.updateUser);
router.delete('/:id',  requirePermission('users.manage'), c.deleteUser);
router.post('/:id/password', requirePermission('users.manage'), validateBody(c.resetPasswordSchema), c.resetPassword);

export default router;
