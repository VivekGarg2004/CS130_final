import { Router } from 'express';
import { TradeController } from '../controllers/TradeController.js';

const router = Router();

// /api/trade
router.get('/account', TradeController.getAccount);
router.get('/positions', TradeController.getPositions);
router.get('/orders', TradeController.getOrders);
router.post('/orders', TradeController.placeOrder);

export default router;
