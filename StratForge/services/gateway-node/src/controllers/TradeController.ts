import { Request, Response } from 'express';
import { alpacaService } from '../services/AlpacaService.js';
import { VirtualizationProxy } from '../services/VirtualizationProxy.js';
import { pool } from '../db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class TradeController {

    // Express handler for manual orders
    static async handlePlaceOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            const result = await this.placeOrder(userId, req.body);
            res.status(201).json(result);
        } catch (err: any) {
            console.error("Order Execution Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    // Core logic for placing an order (used by both manual and automated flows)
    // TODO: ensure that we do not place orders for symbols that are not supported
    static async placeOrder(userId: string, orderParams: any): Promise<any> {
        const { symbol, qty, side, type, limit_price, time_in_force, sessionId, signalId } = orderParams;

        if (!symbol || !qty || !side) {
            throw new Error("Missing required fields: symbol, qty, side");
        }

        // Using VirtualizationProxy to ensure DB state updates
        return await VirtualizationProxy.executeOrder(userId, {
            symbol,
            qty: Number(qty),
            side,
            type: type || 'market',
            limit_price: limit_price ? Number(limit_price) : undefined,
            time_in_force: time_in_force || 'day',
            sessionId,
            signalId
        });
    }


    static async cancelOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            const tradeRes = await pool.query(
                `SELECT * FROM trades WHERE alpaca_order_id = $1 AND user_id = $2`,
                [id as string, userId]
            );

            if (tradeRes.rows.length === 0) {
                res.status(404).json({ error: "Order not found or access denied" });
                return;
            }

            await alpacaService.cancelOrder(id as string);
            // No need to update DB here; Reconciliation Service will catch the 'CANCELED' state
            // and process the refund/status update.

            res.status(200).json({ message: "Order cancellation requested" });
        } catch (err: any) {
            console.error("Cancel Order Error:", err);
            res.status(500).json({ error: err.message });
        }
    }


    // GET /api/trades - Get trade history for current user
    static async listUserTrades(req: AuthenticatedRequest, res: Response): Promise<void> {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            const result = await pool.query(
                `SELECT t.id, t.symbol, t.action, t.price, t.quantity, t.executed_at,
                        s.name as strategy_name
                 FROM trades t
                 LEFT JOIN sessions sess ON t.session_id = sess.id
                 LEFT JOIN strategies s ON sess.strategy_id = s.id
                 WHERE t.user_id = $1
                 ORDER BY t.executed_at DESC
                 LIMIT 100`,
                [userId]
            );

            res.json({
                trades: result.rows.map(t => ({
                    id: t.id,
                    symbol: t.symbol,
                    action: t.action,
                    price: parseFloat(t.price),
                    quantity: parseFloat(t.quantity),
                    executedAt: t.executed_at,
                    strategyName: t.strategy_name || 'Unknown'
                }))
            });
        } catch (error) {
            console.error('[TRADE] List error:', error);
            res.status(500).json({ error: 'Failed to fetch trades' });
        }
    }

    // GET /api/portfolio - Get virtual portfolio
    static async getPortfolio(req: AuthenticatedRequest, res: Response): Promise<void> {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            // Use VirtualizationProxy for accurate PnL
            const portfolio = await VirtualizationProxy.getVirtualPortfolio(userId);

            const statsResult = await pool.query(
                `SELECT COUNT(*) as total_trades,
                        SUM(CASE WHEN action = 'BUY' THEN 1 ELSE 0 END) as buys,
                        SUM(CASE WHEN action = 'SELL' THEN 1 ELSE 0 END) as sells
                 FROM trades WHERE user_id = $1`,
                [userId]
            );

            const stats = statsResult.rows[0];

            res.json({
                balance: portfolio.cashBalance,       // "Cash on Hand"
                portfolioValue: portfolio.portfolioValue, // "Total Account Value"
                startingBalance: 100000,
                pnl: portfolio.pnl,                   // "Total PnL"
                totalTrades: parseInt(stats.total_trades) || 0,
                buys: parseInt(stats.buys) || 0,
                sells: parseInt(stats.sells) || 0
            });
        } catch (error) {
            console.error('[PORTFOLIO] Error:', error);
            res.status(500).json({ error: 'Failed to fetch portfolio' });
        }
    }

    // GET /api/positions - Get user's stock positions
    static async getUserPositions(req: AuthenticatedRequest, res: Response): Promise<void> {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            const result = await pool.query(
                `SELECT symbol, quantity, average_entry_price, last_updated
                 FROM positions
                 WHERE user_id = $1 AND quantity > 0
                 ORDER BY last_updated DESC`,
                [userId]
            );

            res.json({
                positions: result.rows.map(p => ({
                    symbol: p.symbol,
                    quantity: parseFloat(p.quantity),
                    avgEntryPrice: parseFloat(p.average_entry_price),
                    lastUpdated: p.last_updated
                }))
            });
        } catch (error) {
            console.error('[POSITIONS] Error:', error);
            res.status(500).json({ error: 'Failed to fetch positions' });
        }
    }
}

