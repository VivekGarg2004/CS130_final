import { Router } from 'express';
import { TradeController } from '../controllers/TradeController.js';

const router = Router();

// Internal endpoint - called by Python worker (no auth required)
router.post('/execute', TradeController.execute);

export default router;
