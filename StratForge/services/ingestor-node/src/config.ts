import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (two levels up)
const envPath = path.resolve(__dirname, '../../../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('Parsed .env keys:', Object.keys(result.parsed || {}));
}

export const config = {
    ALPACA_API_KEY: process.env.ALPACA_API_KEY || '',
    ALPACA_SECRET_KEY: process.env.ALPACA_SECRET_KEY || '',
    strats: {
        // Use paper trading for now
        FEED: 'iex', // 'iex' for free paper trading, 'sip' for paid
        PAPER: true
    },
    REDIS_URL: process.env.REDIS_URL || (process.env.REDIS_HOST === 'redis' ? 'redis://localhost:6379' : `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`),
    SYMBOLS: ['AAPL', 'SPY', 'QQQ'], // Stock Symbols
    CRYPTO_SYMBOLS: ['BTC/USD', 'ETH/USD'] // Crypto Symbols
};

if (!config.ALPACA_API_KEY || !config.ALPACA_SECRET_KEY) {
    console.error("Missing Alpaca Credentials in .env");
    process.exit(1);
}
