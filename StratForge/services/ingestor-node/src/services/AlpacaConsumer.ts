// @ts-ignore
import AlpacaRaw from '@alpacahq/alpaca-trade-api';
// Workaround for strict ESM/TypeScript issue with Alpaca SDK
const Alpaca = AlpacaRaw as any;

import { config } from '../config.js';
import { AlpacaBar, AlpacaTrade, NormalizedBar, NormalizedTrade } from '../types.js';
import { BaseConsumer } from './BaseConsumer.js';
import { logger } from '../utils/logger.js';

export class AlpacaConsumer extends BaseConsumer {
    private alpaca: any;
    private socket: any;

    constructor() {
        super();
        this.alpaca = new Alpaca({
            keyId: config.ALPACA_API_KEY,
            secretKey: config.ALPACA_SECRET_KEY,
            paper: config.strats.PAPER,
            feed: config.strats.FEED
        });

        this.socket = this.alpaca.data_stream_v2;
    }

    public async connect(): Promise<void> {
        logger.info(`Connecting to Alpaca ${config.strats.FEED} feed...`);

        this.socket.onConnect(() => {
            logger.info("Connected to Alpaca Stream!");
            this.flushSubscriptions();
        });

        this.socket.onError((err: any) => {
            logger.error("Alpaca Stream Error:", err);
        });

        this.socket.onStockBar((bar: AlpacaBar) => {
            this.processBar(bar);
        });

        this.socket.onStockTrade((trade: AlpacaTrade) => {
            this.processTrade(trade);
        });

        this.socket.onDisconnect(() => {
            logger.warn("Alpaca Stream Disconnected");
        });

        this.socket.connect();
    }

    public disconnect(): void {
        this.socket.disconnect();
    }

    protected flushSubscriptions() {
        // SDK handles connection recovery, but we should make sure our current requested set is subscribed
        const bars = Array.from(this.subscribedBars);
        const trades = Array.from(this.subscribedTrades);

        if (this.socket.connected) {
            if (bars.length > 0) {
                logger.info(`Subscribing to bars: ${bars.join(', ')}`);
                this.socket.subscribeForBars(bars);
            }
            if (trades.length > 0) {
                logger.info(`Subscribing to trades: ${trades.join(', ')}`);
                this.socket.subscribeForTrades(trades);
            }
        }
    }

    private processBar(bar: AlpacaBar) {
        // Normalize
        const normalized: NormalizedBar = {
            symbol: bar.Symbol,
            timeframe: "1m",
            open: Number(bar.OpenPrice),
            high: Number(bar.HighPrice),
            low: Number(bar.LowPrice),
            close: Number(bar.ClosePrice),
            volume: Number(bar.Volume),
            timestamp: new Date(bar.Timestamp).toISOString()
        };

        if (this.onBarCallback) {
            this.onBarCallback(normalized);
        }
    }

    private processTrade(trade: AlpacaTrade) {
        const normalized: NormalizedTrade = {
            symbol: trade.Symbol,
            price: Number(trade.Price),
            size: Number(trade.Size),
            timestamp: new Date(trade.Timestamp).toISOString(),
            tickType: 'trade'
        };

        if (this.onTradeCallback) {
            this.onTradeCallback(normalized);
        }
    }
}
