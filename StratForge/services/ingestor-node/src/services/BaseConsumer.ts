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
    protected abstract flushSubscriptions(newBars?: string[], newTrades?: string[]): void;

    public setOnBarCallback(callback: (bar: NormalizedBar) => void) {
        this.onBarCallback = callback;
    }

    public setOnTradeCallback(callback: (trade: NormalizedTrade) => void) {
        this.onTradeCallback = callback;
    }

    public subscribeToBars(symbols: string[]) {
        const newSymbols: string[] = [];
        symbols.forEach(s => {
            if (!this.subscribedBars.has(s)) {
                this.subscribedBars.add(s);
                newSymbols.push(s);
            }
        });

        if (newSymbols.length > 0) {
            logger.info(`Subscribing to ${newSymbols.length} new bars. Total tracked: ${this.subscribedBars.size}`);
            this.flushSubscriptions(newSymbols, undefined);
        }
    }

    public subscribeToTrades(symbols: string[]) {
        const newSymbols: string[] = [];
        symbols.forEach(s => {
            if (!this.subscribedTrades.has(s)) {
                this.subscribedTrades.add(s);
                newSymbols.push(s);
            }
        });

        if (newSymbols.length > 0) {
            logger.info(`Subscribing to ${newSymbols.length} new trades. Total tracked: ${this.subscribedTrades.size}`);
            this.flushSubscriptions(undefined, newSymbols);
        }
    }
}
