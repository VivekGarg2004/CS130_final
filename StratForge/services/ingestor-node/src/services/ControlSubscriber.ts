import { createClient, RedisClientType } from 'redis';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { StockConsumer } from './StockConsumer.js';
import { CryptoConsumer } from './CryptoConsumer.js';

export class ControlSubscriber {
    private client: RedisClientType;
    private StockConsumer: StockConsumer;
    private cryptoConsumer: CryptoConsumer;

    constructor(StockConsumer: StockConsumer, crypto: CryptoConsumer) {
        this.StockConsumer = StockConsumer;
        this.cryptoConsumer = crypto;

        this.client = createClient({
            url: config.REDIS_URL
        });

        this.client.on('error', (err) => logger.error('Control Subscriber Error', err));
        this.client.on('connect', () => logger.info('Control Subscriber Connected'));
    }

    async connect(): Promise<void> {
        await this.client.connect();

        // 1. Reconciliation (Boot Sync)
        await this.reconcile();

        // 2. Subscribe to control channel
        await this.client.subscribe('system:subscription_updates', (message) => {
            this.handleMessage(message);
        });

        logger.info("Listening for control events on 'system:subscription_updates'");
    }

    private async reconcile() {
        try {
            logger.info("Starting Boot Reconciliation...");

            // Fetch all active subscriptions from Redis Sets
            const stockSymbols = await this.client.sMembers('active_subscriptions:stock');
            const cryptoSymbols = await this.client.sMembers('active_subscriptions:crypto');

            if (stockSymbols.length > 0) {
                logger.info(`[RECONCILE] Recovering ${stockSymbols.length} active stock sessions: ${stockSymbols.join(', ')}`);
                this.StockConsumer.subscribeToBars(stockSymbols);
                this.StockConsumer.subscribeToTrades(stockSymbols);
            }

            if (cryptoSymbols.length > 0) {
                logger.info(`[RECONCILE] Recovering ${cryptoSymbols.length} active crypto sessions: ${cryptoSymbols.join(', ')}`);
                this.cryptoConsumer.subscribeToBars(cryptoSymbols);
                this.cryptoConsumer.subscribeToTrades(cryptoSymbols);
            }

            logger.info("Reconciliation Complete.");
        } catch (err) {
            logger.error("Failed to reconcile subscriptions:", err);
        }
    }


    private handleMessage(message: string) {
        try {
            const event = JSON.parse(message);
            const { action, symbol, type } = event;

            logger.info(`[CONTROL] Received command: ${action} ${symbol} (${type})`);

            if (action === 'subscribe') {
                if (type === 'crypto') {
                    this.cryptoConsumer.subscribeToBars([symbol]);
                    this.cryptoConsumer.subscribeToTrades([symbol]);
                } else {
                    // Default to Stock
                    this.StockConsumer.subscribeToBars([symbol]);
                    this.StockConsumer.subscribeToTrades([symbol]);
                }
            } else if (action === 'unsubscribe') {
                if (type === 'crypto') {
                    this.cryptoConsumer.unsubscribe([symbol]);
                } else {
                    this.StockConsumer.unsubscribe([symbol]);
                }
            }
        } catch (err) {
            logger.error("Failed to process control message:", err);
        }
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
    }
}
