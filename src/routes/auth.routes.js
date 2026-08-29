import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import * as c from '../controllers/auth.controller.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { message: 'Too many login attempts. Try again in 15 minutes.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',   loginLimiter, validateBody(c.loginSchema), c.login);
router.post('/refresh', validateBody(c.refreshSchema), c.refresh);
router.get('/me',       authenticate, c.me);
router.post('/logout',  authenticate, c.logout);

export default router;
