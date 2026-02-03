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

    async addToSet(key: string, value: string) {
        return await this.publisher.sAdd(key, value);
    }

    async removeFromSet(key: string, value: string) {
        return await this.publisher.sRem(key, value);
    }

    // Stream Support
    async xGroupCreate(key: string, group: string, id: string = '$', options?: { MKSTREAM?: boolean }) {
        try {
            return await this.publisher.xGroupCreate(key, group, id, options);
        } catch (e: any) {
            if (e.message.includes('BUSYGROUP')) return 'OK';
            throw e;
        }
    }

    async xReadGroup(group: string, consumer: string, key: string, id: string = '>', count: number = 1) {
        return await this.publisher.xReadGroup(
            group,
            consumer,
            { key, id },
            { COUNT: count, BLOCK: 2000 }
        );
    }

    async xAck(key: string, group: string, id: string) {
        return await this.publisher.xAck(key, group, id);
    }

    async disconnect() {
        await this.publisher.disconnect();
    }
}

export const redisService = new RedisService();
