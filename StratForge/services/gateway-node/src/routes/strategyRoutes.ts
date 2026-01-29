import { Router } from 'express';
import { StrategyController } from '../controllers/StrategyController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// CRUD routes
router.post('/', StrategyController.create);
router.get('/', StrategyController.list);
router.get('/:id', StrategyController.getById);
router.put('/:id', StrategyController.update);
router.post('/:id/stop', StrategyController.stopSessions);
router.delete('/:id', StrategyController.delete);

export default router;
