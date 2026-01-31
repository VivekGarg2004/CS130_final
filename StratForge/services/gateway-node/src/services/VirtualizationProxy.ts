import { pool } from '../db.js';
import { alpacaService } from './AlpacaService.js';

interface PortfolioSummary {
    cashBalance: number;
    portfolioValue: number; // Cash + Positions
    pnl: number;
    positions: {
        symbol: string;
        quantity: number;
        avgEntryPrice: number;
        currentPrice: number;
        marketValue: number;
        unrealizedPl: number;
    }[];
}

interface OrderParams {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    time_in_force: 'day' | 'gtc' | 'ioc';
    limit_price?: number;
}

interface ExecuteResult {
    order: any;
    virtualBalance: number;
    tradeId?: string;
}

export class VirtualizationProxy {

    // NEW: Execute Order Flow with Status Tracking
    static async executeOrder(userId: string, orderParams: OrderParams): Promise<ExecuteResult> {
        const { symbol, qty, side, type } = orderParams;

        // 1. Get current price (approximate for validation) if buying
        let estimatedPrice = 0;
        if (side === 'buy') {
            const prices = await alpacaService.getLatestPrices([symbol]);
            estimatedPrice = prices[symbol] || 0;

            if (estimatedPrice === 0) {
                throw new Error(`Could not fetch price for ${symbol} to validate balance.`);
            }

            // Estimate cost based on price (plus maybe buffer for market orders?)
            // For LIMIT orders, use limit_price if available?
            const priceToCheck = (type === 'limit' && orderParams.limit_price) ? orderParams.limit_price : estimatedPrice;
            const estimatedCost = priceToCheck * qty;

            await this.validateBalance(userId, estimatedCost);
        } else {
            await this.validatePosition(userId, symbol, qty);
        }

        // 2. Execute Real Trade
        const order = await alpacaService.placeOrder(orderParams);

        // 3. Update DB (PENDING State)
        const priceToRecord = estimatedPrice || (orderParams.limit_price ?? 0);

        const client = await pool.connect();
        let tradeId = '';
        let newBalance = 0;

        try {
            await client.query('BEGIN');

            const action = side.toUpperCase();

            if (action === 'BUY') {
                const estimatedCost = priceToRecord * qty;
                await client.query(
                    `UPDATE users SET virtual_balance = virtual_balance - $1 WHERE id = $2`,
                    [estimatedCost, userId]
                );
            }

            // Insert Trade with PENDING status
            const tradeRes = await client.query(
                `INSERT INTO trades (user_id, symbol, action, price, quantity, alpaca_order_id, status, type, executed_at)
                 VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, NOW())
                 RETURNING id`,
                [userId, symbol, action, priceToRecord, qty, (order as any).id, type?.toUpperCase() || 'MARKET']
            );
            tradeId = tradeRes.rows[0].id;

            await client.query('COMMIT');

            const balanceRes = await client.query(`SELECT virtual_balance FROM users WHERE id = $1`, [userId]);
            newBalance = parseFloat(balanceRes.rows[0].virtual_balance);

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        return {
            order,
            virtualBalance: newBalance,
            tradeId
        };
    }

    static async reconcileExecution(
        alpacaOrderId: string,
        fillPrice: number,
        fillQty: number,
        filledAt: Date,
        status: 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED'
    ): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get local trade
            const tradeRes = await client.query(
                `SELECT * FROM trades WHERE alpaca_order_id = $1 FOR UPDATE`,
                [alpacaOrderId]
            );

            if (tradeRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return;
            }

            const trade = tradeRes.rows[0];
            // If already final state, skip
            if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(trade.status)) {
                await client.query('ROLLBACK');
                return;
            }

            const originalPrice = parseFloat(trade.price);
            const qty = parseFloat(trade.quantity);
            const userId = trade.user_id;

            if (status === 'FILLED') {
                // --- FILLED Logic ---
                await client.query(
                    `UPDATE trades SET status = 'FILLED', price = $1, executed_at = $2 WHERE id = $3`,
                    [fillPrice, filledAt, trade.id]
                );

                if (trade.action === 'BUY') {
                    const reserved = originalPrice * qty;
                    const actual = fillPrice * fillQty;
                    const refund = reserved - actual;
                    if (refund !== 0) {
                        await client.query(
                            `UPDATE users SET virtual_balance = virtual_balance + $1 WHERE id = $2`,
                            [refund, userId]
                        );
                    }

                    await client.query(
                        `INSERT INTO positions (user_id, symbol, quantity, average_entry_price, last_updated)
                         VALUES ($1, $2, $3, $4, NOW())
                         ON CONFLICT (user_id, symbol) DO UPDATE SET
                             average_entry_price = (
                                 (positions.quantity * positions.average_entry_price + $3 * $4) 
                                 / (positions.quantity + $3)
                             ),
                             quantity = positions.quantity + $3,
                             last_updated = NOW()`,
                        [userId, trade.symbol, fillQty, fillPrice]
                    );

                } else if (trade.action === 'SELL') {
                    const proceed = fillPrice * fillQty;
                    await client.query(
                        `UPDATE users SET virtual_balance = virtual_balance + $1 WHERE id = $2`,
                        [proceed, userId]
                    );

                    await client.query(
                        `UPDATE positions 
                         SET quantity = quantity - $1, last_updated = NOW()
                         WHERE user_id = $2 AND symbol = $3`,
                        [fillQty, userId, trade.symbol]
                    );
                    await client.query(
                        `DELETE FROM positions WHERE user_id = $1 AND symbol = $2 AND quantity <= 0`,
                        [userId, trade.symbol]
                    );
                }

            } else {
                // --- CANCELED / REJECTED Logic ---
                await client.query(
                    `UPDATE trades SET status = $1 WHERE id = $2`,
                    [status, trade.id]
                );

                if (trade.action === 'BUY') {
                    const reserved = originalPrice * qty;
                    await client.query(
                        `UPDATE users SET virtual_balance = virtual_balance + $1 WHERE id = $2`,
                        [reserved, userId]
                    );
                }
            }

            await client.query('COMMIT');
            console.log(`[Reconciliation] Trade ${trade.id} (${status}) processed.`);

        } catch (e) {
            await client.query('ROLLBACK');
            console.error(`[Reconciliation] Error processing ${alpacaOrderId}:`, e);
            throw e;
        } finally {
            client.release();
        }
    }

    static async validateBalance(userId: string, cost: number): Promise<void> {
        const result = await pool.query(`SELECT virtual_balance FROM users WHERE id = $1`, [userId]);
        const balance = parseFloat(result.rows[0]?.virtual_balance || '0');

        if (balance < cost) {
            throw new Error(`Insufficient virtual balance. Required: $${cost.toFixed(2)}, Available: $${balance.toFixed(2)}`);
        }
    }

    static async validatePosition(userId: string, symbol: string, qty: number): Promise<void> {
        const result = await pool.query(
            `SELECT quantity FROM positions WHERE user_id = $1 AND symbol = $2`,
            [userId, symbol]
        );
        const currentQty = parseFloat(result.rows[0]?.quantity || '0');

        if (currentQty < qty) {
            throw new Error(`Insufficient position. Holding: ${currentQty} ${symbol}, Selling: ${qty}`);
        }
    }

    static async getVirtualBalance(userId: string): Promise<number> {
        const result = await pool.query(`SELECT virtual_balance FROM users WHERE id = $1`, [userId]);
        return parseFloat(result.rows[0]?.virtual_balance || '0');
    }

    static async updateVirtualState(
        userId: string,
        symbol: string,
        side: 'buy' | 'sell',
        qty: number,
        price: number,
        alpacaOrderId?: string
    ): Promise<string> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const action = side.toUpperCase(); // BUY or SELL
            const tradeValue = price * qty;
            const balanceChange = action === 'BUY' ? -tradeValue : tradeValue;

            // 1. Update Balance
            await client.query(
                `UPDATE users SET virtual_balance = virtual_balance + $1 WHERE id = $2`,
                [balanceChange, userId]
            );

            // 2. Upsert/Update Position
            if (action === 'BUY') {
                await client.query(
                    `INSERT INTO positions (user_id, symbol, quantity, average_entry_price, last_updated)
                     VALUES ($1, $2, $3, $4, NOW())
                     ON CONFLICT (user_id, symbol) DO UPDATE SET
                         average_entry_price = (
                             (positions.quantity * positions.average_entry_price + $3 * $4) 
                             / (positions.quantity + $3)
                         ),
                         quantity = positions.quantity + $3,
                         last_updated = NOW()`,
                    [userId, symbol, qty, price]
                );
            } else {
                await client.query(
                    `UPDATE positions 
                     SET quantity = quantity - $3, last_updated = NOW()
                     WHERE user_id = $1 AND symbol = $2`,
                    [userId, symbol, qty]
                );
                // Cleanup zero rows
                await client.query(
                    `DELETE FROM positions WHERE user_id = $1 AND symbol = $2 AND quantity <= 0`,
                    [userId, symbol]
                );
            }

            // 3. Record Trade
            // Note: automated session_id might be null for manual trades. 
            // We need to handle that.
            // Schema has session_id, logic in TradeController.execute used it.
            // For manual trades, we might need a "Manual Session" or allow null?
            // Checking schema... trades.session_id is FK. Is it nullable?
            // "TRADES { ... uuid session_id FK ... }" implies likely nullable unless specified NOT NULL.
            // Let's assume nullable for manual trades.

            const tradeRes = await client.query(
                `INSERT INTO trades (user_id, symbol, action, price, quantity, alpaca_order_id, executed_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 RETURNING id`,
                [userId, symbol, action, price, qty, alpacaOrderId]
            );

            await client.query('COMMIT');
            return tradeRes.rows[0].id;

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    // Existing Logic (Aliased/Refactored)
    static async getVirtualPortfolio(userId: string): Promise<PortfolioSummary> {
        // 1. Fetch user "cash" balance
        const userResult = await pool.query(
            `SELECT virtual_balance FROM users WHERE id = $1`,
            [userId]
        );

        const cashBalance = parseFloat(userResult.rows[0]?.virtual_balance || '100000');
        const initialBalance = 100000;

        // 2. Fetch positions
        const positionResult = await pool.query(
            `SELECT symbol, quantity, average_entry_price 
             FROM positions 
             WHERE user_id = $1 AND quantity > 0`,
            [userId]
        );

        const positions = positionResult.rows.map(row => ({
            symbol: row.symbol,
            quantity: parseFloat(row.quantity),
            avgEntryPrice: parseFloat(row.average_entry_price)
        }));

        // 3. Batch fetch current prices
        const symbols = positions.map(p => p.symbol);
        const currentPrices = await alpacaService.getLatestPrices(symbols);

        // 4. Calculate total value and construct enriched positions
        let positionsValue = 0;
        const enrichedPositions = positions.map(pos => {
            const currentPrice = currentPrices[pos.symbol] || pos.avgEntryPrice; // Fallback
            const marketValue = pos.quantity * currentPrice;
            const unrealizedPl = marketValue - (pos.quantity * pos.avgEntryPrice);

            positionsValue += marketValue;

            return {
                symbol: pos.symbol,
                quantity: pos.quantity,
                avgEntryPrice: pos.avgEntryPrice,
                currentPrice,
                marketValue,
                unrealizedPl
            };
        });

        const totalEquity = cashBalance + positionsValue;
        const totalPnl = totalEquity - initialBalance;

        return {
            cashBalance,
            portfolioValue: totalEquity,
            pnl: totalPnl,
            positions: enrichedPositions
        };
    }

    // Alias for backward compatibility if needed, or just use getVirtualPortfolio
    static async calculatePortfolio(userId: string) {
        return this.getVirtualPortfolio(userId);
    }
}
