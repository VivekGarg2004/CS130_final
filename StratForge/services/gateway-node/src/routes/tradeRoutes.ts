import { Router } from 'express';
import { TradeController } from '../controllers/TradeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// /api/trade
router.get('/account', TradeController.getAccount);
router.get('/positions', TradeController.getPositions);
router.get('/orders', TradeController.getOrders);
router.post('/orders', TradeController.placeOrder);
router.delete('/orders/:id', authMiddleware, TradeController.cancelOrder);

// Virtual portfolio routes (requires auth)
router.get('/history', authMiddleware, TradeController.listUserTrades);
router.get('/portfolio', authMiddleware, TradeController.getPortfolio);
router.get('/my-positions', authMiddleware, TradeController.getUserPositions);

export default router;
