import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';

class RedisService {
    private publisher: RedisClientType;

    constructor() {
        this.publisher = createClient({ url: config.REDIS_URL });

        this.publisher.on('error', (err) => console.error('Redis Client Error', err));
        this.publisher.on('connect', () => console.log('Redis Publisher Connected'));
    }

    async connect() {
        if (!this.publisher.isOpen) {
            await this.publisher.connect();
        }
    }

    async publish(channel: string, message: string) {
        return await this.publisher.publish(channel, message);
    }
    async get(key: string): Promise<string | null> {
        return await this.publisher.get(key);
    }

    async keys(pattern: string): Promise<string[]> {
        return await this.publisher.keys(pattern);
    }
    
    async addToSet(key: string, value: string) {
        return await this.publisher.sAdd(key, value);
    }

    async removeFromSet(key: string, value: string) {
        return await this.publisher.sRem(key, value);
    }

    async disconnect() {
        await this.publisher.disconnect();
    }
}

export const redisService = new RedisService();
