import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import * as c from '../controllers/reference.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',       requirePermission('products.view'),   c.listCategories);
router.post('/',      requirePermission('products.update'), validateBody(c.categorySchema), c.createCategory);
router.patch('/:id',  requirePermission('products.update'), validateBody(c.categorySchema.partial()), c.updateCategory);
router.delete('/:id', requirePermission('products.update'), c.deleteCategory);

export default router;
