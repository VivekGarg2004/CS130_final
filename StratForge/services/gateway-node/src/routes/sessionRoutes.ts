import { Router } from 'express';
import { SessionController } from '../controllers/SessionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.post('/', SessionController.create);
router.post('/:id/stop', SessionController.stop);

export default router;
