import { NormalizedBar, NormalizedTrade } from '../types.js';
import { logger } from '../utils/logger.js';

export abstract class BaseConsumer {
    protected subscribedBars: Set<string> = new Set();
    protected subscribedTrades: Set<string> = new Set();

    protected onBarCallback: ((bar: NormalizedBar) => void) | null = null;
    protected onTradeCallback: ((trade: NormalizedTrade) => void) | null = null;

    constructor() { }

    public abstract connect(): Promise<void>;
    public abstract disconnect(): void;
    protected abstract flushSubscriptions(): void;

    public setOnBarCallback(callback: (bar: NormalizedBar) => void) {
        this.onBarCallback = callback;
    }

    public setOnTradeCallback(callback: (trade: NormalizedTrade) => void) {
        this.onTradeCallback = callback;
    }

    public subscribeToBars(symbols: string[]) {
        let newSubs = 0;
        symbols.forEach(s => {
            if (!this.subscribedBars.has(s)) {
                this.subscribedBars.add(s);
                newSubs++;
            }
        });

        if (newSubs > 0) {
            logger.info(`Subscribing to ${newSubs} new bars. Total: ${this.subscribedBars.size}`);
            this.flushSubscriptions();
        }
    }

    public subscribeToTrades(symbols: string[]) {
        let newSubs = 0;
        symbols.forEach(s => {
            if (!this.subscribedTrades.has(s)) {
                this.subscribedTrades.add(s);
                newSubs++;
            }
        });

        if (newSubs > 0) {
            logger.info(`Subscribing to ${newSubs} new trades. Total: ${this.subscribedTrades.size}`);
            this.flushSubscriptions();
        }
    }
}
