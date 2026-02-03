import { databaseService } from './DatabaseService.js';
import { redisService } from './RedisService.js';
import { REDIS_CHANNELS, REDIS_KEYS, DEFAULTS } from '../config/constants.js';
import { SubscriptionEvent } from '../types/api.js';

export const sessionService = {
    async startSession(data: { symbol: string, type: string, strategyId: string }) {
        console.log(`[SERVICE] Starting session for ${data.symbol} (Strategy: ${data.strategyId})...`);

        // 1. Create Session in DB
        const session = await databaseService.createSession({
            symbol: data.symbol,
            type: data.type || 'stock',
            strategyId: data.strategyId
        });

        // 2. Add to Redis Set (Persistence)
        const setKey = REDIS_KEYS.ACTIVE_SUBSCRIPTIONS(session.type as 'stock' | 'crypto');
        await redisService.addToSet(setKey, session.symbol);

        // 3. Publish Subscribe Event with session/strategy info for worker
        const event: SubscriptionEvent = {
            action: 'subscribe',
            symbol: session.symbol,
            type: session.type as 'stock' | 'crypto',
            strategyId: data.strategyId,
            sessionId: session.id
        };
        await redisService.publish(REDIS_CHANNELS.SUBSCRIPTION_UPDATES, JSON.stringify(event));

        console.log(`[SERVICE] Session Started. Subscribed to ${session.symbol}`);

        return { session, event };
    },

    async stopSession(sessionId: string) {
        console.log(`[SERVICE] Stopping session ${sessionId}...`);

        // 1. Stop Session in DB
        const session = await databaseService.stopSession(sessionId);
        if (!session) {
            return null;
        }

        // 2. Check overlap
        const isStillNeeded = await databaseService.hasActiveSessionsForSymbol(session.symbol);

        if (!isStillNeeded) {
            // 3. Remove from Redis Set
            const setKey = REDIS_KEYS.ACTIVE_SUBSCRIPTIONS(session.type as 'stock' | 'crypto');
            await redisService.removeFromSet(setKey, session.symbol);

            // 4. Publish Unsubscribe Event
            const event: SubscriptionEvent = {
                action: 'unsubscribe',
                symbol: session.symbol,
                type: session.type as 'stock' | 'crypto',
                strategyId: session.strategyId,
                sessionId: session.id
            };
            await redisService.publish(REDIS_CHANNELS.SUBSCRIPTION_UPDATES, JSON.stringify(event));
            console.log(`[SERVICE] Last session for ${session.symbol} stopped. Unsubscribing.`);
        } else {
            console.log(`[SERVICE] Session stopped, but ${session.symbol} is still needed by others.`);
        }

        return session;
    },

    // TODO: allow for crypto to be stopped we need a way to tell a symbol what type it is and if it is valid 
    async stopStrategySessions(strategyId: string) {
        console.log(`[SERVICE] Stopping all sessions for strategy ${strategyId}...`);

        // 1. Stop in DB and get all session IDs
        const { symbol, sessionIds, count } = await databaseService.stopStrategySessions(strategyId);
        if (count === 0) return { count: 0 };

        // 2. Publish unsubscribe event for EACH session
        for (const sessionId of sessionIds) {
            const event: SubscriptionEvent = {
                action: 'unsubscribe',
                symbol,
                type: DEFAULTS.ASSET_TYPE,
                strategyId,
                sessionId
            };
            await redisService.publish(REDIS_CHANNELS.SUBSCRIPTION_UPDATES, JSON.stringify(event));
            console.log(`[SERVICE] Published unsubscribe for session ${sessionId}`);
        }

        // 3. Check if symbol is still needed by other strategies
        const isStillNeeded = await databaseService.hasActiveSessionsForSymbol(symbol);

        if (!isStillNeeded) {
            // 4. Cleanup Redis subscription set (Ingestor will see this)
            const setKey = REDIS_KEYS.ACTIVE_SUBSCRIPTIONS(DEFAULTS.ASSET_TYPE);
            await redisService.removeFromSet(setKey, symbol);
            console.log(`[SERVICE] Strategy ${strategyId} stopped. Last session for ${symbol} cleaned up.`);
        }

        return { count, symbol, sessionIds };
    }
};
