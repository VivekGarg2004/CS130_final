
import { alpacaService } from './AlpacaService.js';
import { VirtualizationProxy } from './VirtualizationProxy.js';
import { pool } from '../db.js';

export class TradeReconciliationService {
    private isRunning = false;
    private checkIntervalMs = 10000; // 10 seconds
    private lastCheckTime: Date;

    constructor() {
        this.lastCheckTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Start looking back 24h just in case
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[TradeReconciliation] Service started. Polling every 10s.');
        this.poll();
    }

    stop() {
        this.isRunning = false;
    }

    private async poll() {
        if (!this.isRunning) return;

        try {
            await this.checkTrades();
        } catch (error) {
            console.error('[TradeReconciliation] Error during poll:', error);
        }

        setTimeout(() => this.poll(), this.checkIntervalMs);
    }

    private async checkTrades() {
        // 1. Fetch recently closed orders from Alpaca
        // We want to limit to recent activity to avoid fetching huge history.
        // Alpaca 'closed' includes filled, canceled, expired, rejected.

        // Note: Alpaca API v2 orders endpoint supports 'after'.
        // Format of after: localized or ISO8601 string.

        const now = new Date();
        const orders = await alpacaService.getOrders({
            status: 'closed',
            limit: 50, // Batch size
            after: this.lastCheckTime.toISOString()
        });

        if (orders.length > 0) {
            console.log(`[TradeReconciliation] Found ${orders.length} closed orders since ${this.lastCheckTime.toISOString()}`);

            for (const order of orders) {
                try {
                    // Map Alpaca status to our status
                    // Alpaca: new, partially_filled, filled, done_for_day, canceled, expired, replaced, pending_cancel, pending_replace, accepted, pending_new, accepted_for_bidding, stopped, rejected, suspended, calculated
                    // We value: FILLED, CANCELED, REJECTED, EXPIRED.
                    // If 'partially_filled', we might wait or handle partials?
                    // MVP: Wait for 'filled' or 'canceled'.

                    let status: 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' | null = null;
                    if (order.status === 'filled') status = 'FILLED';
                    else if (order.status === 'canceled') status = 'CANCELED';
                    else if (order.status === 'rejected') status = 'REJECTED';
                    else if (order.status === 'expired') status = 'EXPIRED';

                    if (status) {
                        const filledAt = order.filled_at ? new Date(order.filled_at) : new Date();
                        const fillPrice = parseFloat(order.filled_avg_price || order.price || '0'); // filled_avg_price is reliable for filled
                        const fillQty = parseFloat(order.filled_qty || order.qty || '0');

                        // If canceled, fillPrice might be 0, but we need original qty to refund reservation?
                        // reconcileExecution handles this lookup.

                        await VirtualizationProxy.reconcileExecution(
                            order.id,
                            fillPrice,
                            status === 'FILLED' ? fillQty : 0,
                            filledAt,
                            status
                        );
                    }
                } catch (err) {
                    console.error(`[TradeReconciliation] Failed to process order ${order.id}:`, err);
                }
            }

            // Update last check time
            // Use the timestamp of the latest order processed? Or just Now?
            // Safer to track Now, overlapping slightly?
            // For simplicity, update to Now.
            this.lastCheckTime = now;
        }
    }
}

export const tradeReconciliationService = new TradeReconciliationService();
