import { Router } from 'express';
import { TradeController } from '../controllers/TradeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// /api/trade
router.post('/orders', authMiddleware, TradeController.handlePlaceOrder);
router.delete('/orders/:id', authMiddleware, TradeController.cancelOrder);

// Virtual portfolio routes (requires auth)
router.get('/history', authMiddleware, TradeController.listUserTrades);
router.get('/portfolio', authMiddleware, TradeController.getPortfolio);
router.get('/my-positions', authMiddleware, TradeController.getUserPositions);

export default router;
