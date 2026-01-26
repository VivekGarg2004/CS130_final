import { createClient, RedisClientType } from 'redis';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export class RedisPublisher {
    private client: RedisClientType;

    constructor() {
        this.client = createClient({
            url: config.REDIS_URL
        });

        this.client.on('error', (err) => logger.error('Redis Publisher Error', err));
        this.client.on('connect', () => logger.info('Redis Publisher Connected'));
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async publish(channel: string, message: string): Promise<number> {
        return await this.client.publish(channel, message);
    }

    async disconnect(): Promise<void> {
        await this.client.disconnect();
    }
}
