import { Request, Response } from 'express';
import { alpacaService } from '../services/AlpacaService.js';
import { pool } from '../db.js';

interface AuthenticatedRequest extends Request {
    user?: { id: string };
}

export class TradeController {
    static async getAccount(req: Request, res: Response): Promise<void> {
        try {
            const account = await alpacaService.getAccount();
            res.json(account);
        } catch (err: any) {
            console.error("Alpaca Account Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    static async getPositions(req: Request, res: Response): Promise<void> {
        try {
            const positions = await alpacaService.getPositions();
            res.json(positions);
        } catch (err: any) {
            console.error("Alpaca Positions Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    static async placeOrder(req: Request, res: Response): Promise<void> {
        try {
            const { symbol, qty, side, type } = req.body;

            if (!symbol || !qty || !side) {
                res.status(400).json({ error: "Missing required fields: symbol, qty, side" });
                return;
            }

            const order = await alpacaService.placeOrder({
                symbol,
                qty: Number(qty),
                side,
                type: type || 'market',
                time_in_force: 'day'
            });

            res.status(201).json(order);
        } catch (err: any) {
            console.error("Alpaca Order Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    static async getOrders(req: Request, res: Response): Promise<void> {
        try {
            const status = (req.query.status as any) || 'all';
            const orders = await alpacaService.getOrders(status);
            res.json(orders);
        } catch (err: any) {
            console.error("Alpaca History Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    // POST /internal/execute - Receive trade signals from Python worker
    static async execute(req: Request, res: Response): Promise<void> {
        const { sessionId, symbol, action, price, quantity = 1, confidence } = req.body;

        if (!sessionId || !symbol || !action || !price) {
            res.status(400).json({ error: 'Missing required fields: sessionId, symbol, action, price' });
            return;
        }

        console.log(`[TRADE] Signal: ${action} ${quantity} ${symbol} @ $${price}`);

        try {
            // Get session and user
            const sessionResult = await pool.query(
                `SELECT id, user_id FROM sessions WHERE id = $1`,
                [sessionId]
            );

            if (sessionResult.rows.length === 0) {
                res.status(404).json({ error: 'Session not found' });
                return;
            }

            const userId = sessionResult.rows[0].user_id;

            // Create signal
            const signalResult = await pool.query(
                `INSERT INTO signals (session_id, symbol, action, confidence, status, processed_at)
                 VALUES ($1, $2, $3, $4, 'EXECUTED', NOW())
                 RETURNING id`,
                [sessionId, symbol, action, confidence || 0.5]
            );

            // Create trade
            const tradeResult = await pool.query(
                `INSERT INTO trades (session_id, signal_id, user_id, symbol, action, price, quantity)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id, executed_at`,
                [sessionId, signalResult.rows[0].id, userId, symbol, action, price, quantity]
            );

            // Update virtual balance
            const tradeValue = price * quantity;
            const balanceChange = action === 'BUY' ? -tradeValue : tradeValue;
            await pool.query(
                `UPDATE users SET virtual_balance = virtual_balance + $1 WHERE id = $2`,
                [balanceChange, userId]
            );

            // Update positions
            if (action === 'BUY') {
                // Upsert position: add quantity and recalculate average entry price
                await pool.query(
                    `INSERT INTO positions (user_id, symbol, quantity, average_entry_price, last_updated)
                     VALUES ($1, $2, $3, $4, NOW())
                     ON CONFLICT (user_id, symbol) DO UPDATE SET
                         average_entry_price = (
                             (positions.quantity * positions.average_entry_price + $3 * $4) 
                             / (positions.quantity + $3)
                         ),
                         quantity = positions.quantity + $3,
                         last_updated = NOW()`,
                    [userId, symbol, quantity, price]
                );
            } else if (action === 'SELL') {
                // Reduce position quantity
                await pool.query(
                    `UPDATE positions 
                     SET quantity = quantity - $3, last_updated = NOW()
                     WHERE user_id = $1 AND symbol = $2`,
                    [userId, symbol, quantity]
                );
                // Remove position if quantity is 0 or less
                await pool.query(
                    `DELETE FROM positions WHERE user_id = $1 AND symbol = $2 AND quantity <= 0`,
                    [userId, symbol]
                );
            }

            console.log(`[TRADE] Executed: ${tradeResult.rows[0].id} | Position updated`);

            res.status(201).json({
                message: 'Trade executed',
                tradeId: tradeResult.rows[0].id,
                signalId: signalResult.rows[0].id
            });
        } catch (error) {
            console.error('[TRADE] Execute error:', error);
            res.status(500).json({ error: 'Failed to execute trade' });
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
            const userResult = await pool.query(
                `SELECT virtual_balance FROM users WHERE id = $1`,
                [userId]
            );

            const balance = userResult.rows[0]?.virtual_balance || 100000;

            const statsResult = await pool.query(
                `SELECT COUNT(*) as total_trades,
                        SUM(CASE WHEN action = 'BUY' THEN 1 ELSE 0 END) as buys,
                        SUM(CASE WHEN action = 'SELL' THEN 1 ELSE 0 END) as sells
                 FROM trades WHERE user_id = $1`,
                [userId]
            );

            const stats = statsResult.rows[0];

            res.json({
                balance: parseFloat(balance),
                startingBalance: 100000,
                pnl: parseFloat(balance) - 100000,
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

