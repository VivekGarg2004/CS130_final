import { config } from './config.js';
import { StockConsumer } from './services/StockConsumer.js';
import { CryptoConsumer } from './services/CryptoConsumer.js';
import { RedisPublisher } from './services/RedisPublisher.js';
import { ControlSubscriber } from './services/ControlSubscriber.js';
import { NormalizedBar, NormalizedTrade } from './types.js';
import { logger } from './utils/logger.js';

async function main() {
    logger.info("Starting Market Data Ingestor Service...");

    // 1. Initialize Services
    const redisPublisher = new RedisPublisher();
    const alpacaConsumer = new StockConsumer();
    const cryptoConsumer = new CryptoConsumer();

    // 2. Connect Redis
    await redisPublisher.connect();

    // Helper to publish bars
    const handleBar = async (bar: NormalizedBar) => {
        const channel = `market_data:${bar.symbol}`;
        const payload = JSON.stringify(bar);

        try {
            const subscribers = await redisPublisher.publish(channel, payload);
            logger.info(`[BAR] [${bar.symbol}] $${bar.close} -> ${channel} (${subscribers} subs)`);
        } catch (err) {
            logger.error(`Failed to publish Bar to Redis:`, err);
        }
    };

    // Helper to publish trades
    const handleTrade = async (trade: NormalizedTrade) => {
        const channel = `market_trades:${trade.symbol}`;
        const payload = JSON.stringify(trade);

        try {
            const subscribers = await redisPublisher.publish(channel, payload);
            logger.info(`[TRADE] [${trade.symbol}] $${trade.price} -> ${channel} (${subscribers} subs)`);
        } catch (err) {
            logger.error(`Failed to publish Trade to Redis:`, err);
        }
    };

    // 3. Setup Pipelines
    alpacaConsumer.setOnBarCallback(handleBar);
    alpacaConsumer.setOnTradeCallback(handleTrade);

    cryptoConsumer.setOnBarCallback(handleBar);
    cryptoConsumer.setOnTradeCallback(handleTrade);

    // 4. Connect feeds
    logger.info("Connecting feeds...");

    // Connect Stock
    await alpacaConsumer.connect();
    alpacaConsumer.subscribeToBars(config.SYMBOLS);
    alpacaConsumer.subscribeToTrades(config.SYMBOLS);

    // Connect Crypto
    const cryptoSymbols = config.CRYPTO_SYMBOLS || ['BTC/USD', 'ETH/USD'];
    await cryptoConsumer.connect();
    cryptoConsumer.subscribeToBars(cryptoSymbols);
    cryptoConsumer.subscribeToTrades(cryptoSymbols);

    // 5. Connect Control Plane
    const controlSubscriber = new ControlSubscriber(alpacaConsumer, cryptoConsumer);
    await controlSubscriber.connect();

    // Keep alive
    process.on('SIGINT', async () => {
        logger.info("\nShutting down...");
        cryptoConsumer.disconnect();
        alpacaConsumer.disconnect(); // Added disconnect for Alpaca
        await redisPublisher.disconnect();
        process.exit(0);
    });
}

main().catch(err => {
    logger.error("Fatal Error:", err);
    process.exit(1);
});
