import WebSocket from 'ws';
import { config } from '../config.js';
import { NormalizedBar, NormalizedTrade } from '../types.js';
import { BaseConsumer } from './BaseConsumer.js';
import { logger } from '../utils/logger.js';

export class StockConsumer extends BaseConsumer {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private shouldReconnect: boolean = true;
    private reconnectDelayMs: number = 5000;

    // Feed options: 'iex' (free), 'sip' (paid subscription required)
    private readonly feed: string;
    private readonly URI: string;

    constructor(feed: 'iex' | 'sip' = 'iex') {
        super();
        this.feed = feed;
        this.URI = `wss://stream.data.alpaca.markets/v2/${this.feed}`;
    }

    public async connect(): Promise<void> {
        this.shouldReconnect = true;
        logger.info(`Connecting to Alpaca Stock Stream (${this.URI})...`);

        return new Promise((resolve) => {
            this.ws = new WebSocket(this.URI);

            this.ws.on('open', () => {
                logger.info("Socket open. Waiting for welcome message...");
                // Do NOT authenticate here. Wait for server to say hello.
                resolve();
            });

            this.ws.on('message', (data: WebSocket.RawData) => {
                try {
                    const messageString = data.toString();
                    const parsed = JSON.parse(messageString);
                    const messages = Array.isArray(parsed) ? parsed : [parsed];

                    messages.forEach((msg: any) => this.handleMessage(msg));
                } catch (err) {
                    logger.error("Error parsing message:", err);
                }
            });

            this.ws.on('error', (err) => {
                logger.error("Stock WebSocket Error:", err);
            });

            this.ws.on('close', () => {
                logger.warn("Stock Stream Disconnected");
                this.isConnected = false;
                this.ws = null;

                if (this.shouldReconnect) {
                    logger.info(`Reconnecting in ${this.reconnectDelayMs / 1000}s...`);
                    setTimeout(() => {
                        this.connect().catch(err => logger.error("Reconnection failed:", err));
                    }, this.reconnectDelayMs);
                }
            });
        });
    }

    public disconnect(): void {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close();
        }
    }

    protected flushSubscriptions(newBars?: string[], newTrades?: string[]): void {
        // Only flush if we are fully authenticated
        if (!this.isConnected) {
            return;
        }

        // If specific new symbols are provided (incremental update), use them.
        // Otherwise (reconnect), use the full set.
        const barsToSend = newBars ? newBars : Array.from(this.subscribedBars);
        const tradesToSend = newTrades ? newTrades : Array.from(this.subscribedTrades);

        if (barsToSend.length === 0 && tradesToSend.length === 0) return;

        this.sendSubscribe({
            bars: barsToSend.length > 0 ? barsToSend : undefined,
            trades: tradesToSend.length > 0 ? tradesToSend : undefined
        });
    }

    private authenticate() {
        const authMsg = {
            action: 'auth',
            key: config.ALPACA_API_KEY,
            secret: config.ALPACA_SECRET_KEY
        };
        logger.info("Sending Auth...");
        this.ws?.send(JSON.stringify(authMsg));
    }

    private sendSubscribe(payload: { bars?: string[], trades?: string[], quotes?: string[] }) {
        const subMsg = {
            action: 'subscribe',
            ...payload
        };
        logger.info(`Sending Stock Subscription: ${JSON.stringify(subMsg)}`);
        this.ws?.send(JSON.stringify(subMsg));
    }

    private handleMessage(msg: any) {
        // 1. Connection established - Server says "connected"
        if (msg.T === 'success' && msg.msg === 'connected') {
            logger.info("Received welcome message. Authenticating...");
            this.authenticate();
        }
        // 2. Authentication success - Server says "authenticated"
        else if (msg.T === 'success' && msg.msg === 'authenticated') {
            logger.info("Stock Authenticated! Flushing subscriptions...");
            this.isConnected = true; // NOW we are ready
            this.flushSubscriptions();
        }
        // 3. Subscription confirmed
        else if (msg.T === 'subscription') {
            logger.info(`Stock Subscription confirmed: ${JSON.stringify(msg)}`);
        }
        // 4. Data processing
        else if (msg.T === 'b') {
            // Bar/Minute Bar
            this.processBar(msg);
        }
        else if (msg.T === 't') {
            // Trade
            this.processTrade(msg);
        }
        else if (msg.T === 'q') {
            // Quote - you can add quote processing if needed
            this.processQuote(msg);
        }
        else if (msg.T === 'error') {
            logger.error(`Stock Stream Error: ${msg.msg} (code: ${msg.code})`);
        }
    }

    private processBar(msg: any) {
        const normalized: NormalizedBar = {
            symbol: msg.S,
            timeframe: "1m",
            open: Number(msg.o),
            high: Number(msg.h),
            low: Number(msg.l),
            close: Number(msg.c),
            volume: Number(msg.v),
            timestamp: new Date(msg.t).toISOString()
        };

        if (this.onBarCallback) {
            this.onBarCallback(normalized);
        }
    }

    private processTrade(msg: any) {
        const normalized: NormalizedTrade = {
            symbol: msg.S,
            price: Number(msg.p),
            size: Number(msg.s),
            timestamp: new Date(msg.t).toISOString(),
            tickType: 'trade',
        };

        if (this.onTradeCallback) {
            this.onTradeCallback(normalized);
        }
    }

    private processQuote(msg: any) {
        // Optional: Handle quote data
        // Quote structure: { T: 'q', S: symbol, bx: bid exchange, bp: bid price, bs: bid size,
        //                    ax: ask exchange, ap: ask price, as: ask size, t: timestamp, c: conditions, z: tape }
        logger.debug(`QUOTE: ${msg.S} - Bid: ${msg.bp} x ${msg.bs}, Ask: ${msg.ap} x ${msg.as}`);

        // You can create a normalized quote type and callback if needed
        // For now, we'll just log it
    }

    // Additional method to subscribe to quotes if needed
    public subscribeQuotes(symbols: string[]): void {
        symbols.forEach(s => this.subscribedBars.add(s)); // Reuse the bars set or create a new one
        this.flushSubscriptions();
    }

    public unsubscribe(symbols: string[]): void {
        const toUnsubscribe: string[] = [];
        symbols.forEach(s => {
            if (this.subscribedBars.delete(s)) toUnsubscribe.push(s);
            this.subscribedTrades.delete(s); // Remove from both
        });

        if (toUnsubscribe.length > 0 && this.isConnected) {
            const unsubMsg = {
                action: 'unsubscribe',
                bars: toUnsubscribe,
                trades: toUnsubscribe
            };
            logger.info(`Sending Stock Unsubscription: ${JSON.stringify(unsubMsg)}`);
            this.ws?.send(JSON.stringify(unsubMsg));
        }
    }
}