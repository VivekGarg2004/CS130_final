import WebSocket from 'ws';
import { config } from '../config.js';
import { NormalizedBar, NormalizedTrade } from '../types.js';
import { BaseConsumer } from './BaseConsumer.js';
import { logger } from '../utils/logger.js';

export class CryptoConsumer extends BaseConsumer {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private shouldReconnect: boolean = true;
    private reconnectDelayMs: number = 5000;

    // Raw v1beta3 stream
    private readonly URI = 'wss://stream.data.alpaca.markets/v1beta3/crypto/us';

    constructor() {
        super();
    }

    public async connect(): Promise<void> {
        this.shouldReconnect = true; // Ensure we want to connect
        logger.info(`Connecting to Alpaca Crypto Stream (${this.URI})...`);

        return new Promise((resolve) => {
            this.ws = new WebSocket(this.URI);

            this.ws.on('open', () => {
                logger.info("Connected to Crypto Stream!");
                this.authenticate();
                // Resolve the promise once connected, but we might not be authenticated yet.
                // For simplicity, we resolve here.
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
                logger.error("Crypto WebSocket Error:", err);
            });

            this.ws.on('close', () => {
                logger.warn("Crypto Stream Disconnected");
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

    protected flushSubscriptions(): void {
        if (!this.isConnected) {
            // Will flow on reconnect
            return;
        }

        const bars = Array.from(this.subscribedBars);
        const trades = Array.from(this.subscribedTrades);

        if (bars.length === 0 && trades.length === 0) return;

        this.sendSubscribe({
            bars: bars.length > 0 ? bars : undefined,
            trades: trades.length > 0 ? trades : undefined
        });
    }

    private authenticate() {
        const authMsg = {
            action: 'auth',
            key: config.ALPACA_API_KEY,
            secret: config.ALPACA_SECRET_KEY
        };
        this.ws?.send(JSON.stringify(authMsg));
    }

    private sendSubscribe(payload: { bars?: string[], trades?: string[] }) {
        const subMsg = {
            action: 'subscribe',
            ...payload
        };
        logger.info(`Sending Crypto Subscription: ${JSON.stringify(subMsg)}`);
        this.ws?.send(JSON.stringify(subMsg));
    }

    private handleMessage(msg: any) {
        // Auth success
        if (msg.T === 'success' && msg.msg === 'connected') {
            logger.info("Crypto Authenticated! Flushing subscriptions...");
            this.isConnected = true;
            this.flushSubscriptions();
        }
        // Subscription success
        else if (msg.T === 'subscription') {
            logger.info(`Crypto Subscription confirmed: ${JSON.stringify(msg)}`);
        }
        // Bar data (Type 'b')
        else if (msg.T === 'b') {
            this.processBar(msg);
        }
        // Trade data (Type 't')
        else if (msg.T === 't') {
            this.processTrade(msg);
        }
        // Errors
        else if (msg.T === 'error') {
            logger.error(`Crypto Stream Error: ${msg.msg} (code: ${msg.code})`);
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
            tickType: 'trade'
        };

        if (this.onTradeCallback) {
            this.onTradeCallback(normalized);
        }
    }
}
