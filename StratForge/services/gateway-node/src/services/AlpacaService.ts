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

    async getOrders(status: 'open' | 'closed' | 'all' = 'all') {
        return await this.alpaca.getOrders({
            status: status,
            limit: 50,
            direction: 'desc'
        });
    }
}

export const alpacaService = new AlpacaService();
