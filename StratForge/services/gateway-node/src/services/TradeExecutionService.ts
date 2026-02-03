
import { redisService } from './RedisService.js';
import { TradeController } from '../controllers/TradeController.js';
import { pool } from '../db.js';
import { REDIS_STREAMS } from '../config/constants.js';
import { TradeSignal } from '../types/api.js';

export class TradeExecutionService {
    private isRunning = false;
    private streamKey = REDIS_STREAMS.TRADE_SIGNALS;
    private groupName = REDIS_STREAMS.TRADE_SIGNALS_GROUP;
    private consumerName = 'gateway_node_1';

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Ensure Group Exists
        await redisService.xGroupCreate(this.streamKey, this.groupName, '$', { MKSTREAM: true });

        console.log('[TradeExecution] Service started. Listening for signals...');
        this.consumeLoop(); // Start async loop
    }

    stop() {
        this.isRunning = false;
    }

    private async consumeLoop() {
        while (this.isRunning) {
            try {
                // Block for 2s waiting for message
                const result = await redisService.xReadGroup(
                    this.groupName,
                    this.consumerName,
                    this.streamKey,
                    '>', // New messages
                    1
                );

                if (result && result.length > 0) {
                    const stream = result[0]; // { name: 'stream', messages: [...] }
                    const messages = stream.messages;

                    for (const msg of messages) {
                        await this.processMessage(msg);
                        await redisService.xAck(this.streamKey, this.groupName, msg.id);
                    }
                }
            } catch (error) {
                console.error('[TradeExecution] Error in loop:', error);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Backoff
            }
        }
    }

    private async processMessage(msg: { id: string; message: any }) {
        try {
            const payload = msg.message;
            // Redis streams store as key-value strings. 
            // Expected payload keys: symbol, action, quantity, price, sessionId

            const symbol = payload.symbol;
            const action = payload.action; // 'BUY' or 'SELL'
            const qty = parseFloat(payload.quantity || '0');
            const price = parseFloat(payload.price || '0');
            const sessionId = payload.sessionId;
            const signalId = payload.signalId;

            console.log(`[TradeExecution] Received: ${action} ${qty} ${symbol} @ $${price}`);

            // 1. Get User ID from Session
            const sessionRes = await pool.query(`SELECT user_id FROM sessions WHERE id = $1`, [sessionId]);
            if (sessionRes.rows.length === 0) {
                console.error(`[TradeExecution] Session ${sessionId} not found. Skipping.`);
                return;
            }
            const userId = sessionRes.rows[0].user_id;

            // 2. Execute via Proxy
            // NOTE: VirtualizationProxy.executeOrder requires symbol, qty, side, type...
            const result = await TradeController.placeOrder(userId, {
                symbol,
                qty,
                side: action.toLowerCase() as 'buy' | 'sell',
                type: 'market',
                time_in_force: 'day',
                sessionId,
                signalId
            });

            console.log(`[TradeExecution] Executed Trade: ${result.tradeId}`);

        } catch (error) {
            console.error(`[TradeExecution] Failed to process message ${msg.id}:`, error);
            // We still ACK to avoid stuck loop? Or retry?
            // For MVP, ACK and log error to prevent head-of-line blocking.
        }
    }
}

export const tradeExecutionService = new TradeExecutionService();
