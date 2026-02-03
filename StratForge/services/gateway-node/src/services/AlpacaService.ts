import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Alpaca = require('@alpacahq/alpaca-trade-api');
import { config as appConfig } from '../config/index.js';

class AlpacaService {
    private alpaca: any;

    constructor() {

        this.alpaca = new Alpaca({
            keyId: process.env.ALPACA_API_KEY,
            secretKey: process.env.ALPACA_SECRET_KEY,
            paper: true, // Always paper for now as per plan

	    });
    }



    async getAccount() {
        return await this.alpaca.getAccount();
    }

    async getPositions() {
        return await this.alpaca.getPositions();
    }

    async placeOrder(order: {
        symbol: string;
        qty: number;
        side: 'buy' | 'sell';
        type: 'market' | 'limit';
        time_in_force: 'day' | 'gtc' | 'ioc';
        limit_price?: number;
    }) {
        return await this.alpaca.createOrder(order);
    }

    async getOrders(options: {
        status?: 'open' | 'closed' | 'all';
        limit?: number;
        after?: string;
        until?: string;
        direction?: 'asc' | 'desc';
    } = {}) {
        return await this.alpaca.getOrders({
            status: options.status || 'open',
            limit: options.limit || 50,
            direction: options.direction || 'desc',
            after: options.after,
            until: options.until
        });
    }

    async cancelOrder(orderId: string) {
        return await this.alpaca.cancelOrder(orderId);
    }

    async getLatestPrices(symbols: string[]): Promise<Record<string, number>> {
        if (symbols.length === 0) return {};

        try {
            // getSnapshots returns array of objects in some versions
            const snapshotsRaw = await this.alpaca.getSnapshots(symbols);
            const snapshots: Record<string, any> = {};

            if (Array.isArray(snapshotsRaw)) {
                snapshotsRaw.forEach((s: any) => {
                    if (s.symbol) snapshots[s.symbol] = s;
                });
            } else {
                Object.assign(snapshots, snapshotsRaw);
            }

            const prices: Record<string, number> = {};

            for (const symbol of symbols) {
                let price = 0;
                const snapshot = snapshots[symbol];

                if (snapshot) {
                    price = snapshot?.LatestTrade?.Price ||
                        snapshot?.LatestTrade?.p ||
                        snapshot?.latestTrade?.p ||
                        snapshot?.MinuteBar?.ClosePrice ||
                        snapshot?.MinuteBar?.c ||
                        snapshot?.minuteBar?.c ||
                        snapshot?.PrevDailyBar?.ClosePrice ||
                        snapshot?.PrevDailyBar?.c ||
                        snapshot?.prevDailyBar?.c ||
                        0;
                }

                // Fallback if snapshot failed or price is 0
                if (!price) {
                    try {
                        console.log(`[DEBUG] Snapshot missing/empty for ${symbol}. Trying getLatestTrade...`);
                        const trade = await this.alpaca.getLatestTrade(symbol);
                        price = trade.p || trade.Price || 0;
                    } catch (err) {
                        console.warn(`[WARN] Failed to fetch latest trade for ${symbol}`, err);
                    }
                }

                prices[symbol] = price;
            }

            return prices;
        } catch (error) {
            console.error("Alpaca Market Data Error:", error);
            // Fallback for single symbol if batch fails (though getSnapshots is robust)
            // or just return empty/zeros so we don't crash everything
            return {};
        }
    }
}

export const alpacaService = new AlpacaService();
