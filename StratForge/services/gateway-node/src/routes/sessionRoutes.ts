import { Router } from 'express';
import { SessionController } from '../controllers/SessionController.js';

const router = Router();

router.post('/', SessionController.create);
router.post('/:id/stop', SessionController.stop);

export default router;
