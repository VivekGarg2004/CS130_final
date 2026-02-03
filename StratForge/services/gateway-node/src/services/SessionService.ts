import { databaseService } from './DatabaseService.js';
import { redisService } from './RedisService.js';

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
        const setKey = `active_subscriptions:${session.type}`;
        await redisService.addToSet(setKey, session.symbol);

        // 3. Publish Subscribe Event with session/strategy info for worker
        const event = {
            action: 'subscribe',
            symbol: session.symbol,
            type: session.type,
            strategyId: data.strategyId,
            sessionId: session.id  // Worker needs this to POST signals back
        };
        await redisService.publish('system:subscription_updates', JSON.stringify(event));

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
            const setKey = `active_subscriptions:${session.type}`;
            await redisService.removeFromSet(setKey, session.symbol);

            // 4. Publish Unsubscribe Event
            const event = {
                action: 'unsubscribe',
                symbol: session.symbol,
                type: session.type
            };
            await redisService.publish('system:subscription_updates', JSON.stringify(event));
            console.log(`[SERVICE] Last session for ${session.symbol} stopped. Unsubscribing.`);
        } else {
            console.log(`[SERVICE] Session stopped, but ${session.symbol} is still needed by others.`);
        }

        return session;
    },

    async stopStrategySessions(strategyId: string) {
        console.log(`[SERVICE] Stopping all sessions for strategy ${strategyId}...`);

        // 1. Stop in DB
        const { symbol, count } = await databaseService.stopStrategySessions(strategyId);
        if (count === 0) return { count: 0 };

        // 2. Check if symbol is still needed
        const isStillNeeded = await databaseService.hasActiveSessionsForSymbol(symbol);

        if (!isStillNeeded) {
            // 3. Cleanup Redis
            const setKey = `active_subscriptions:stock`;
            await redisService.removeFromSet(setKey, symbol);

            // 4. Publish Unsubscribe
            const event = {
                action: 'unsubscribe',
                symbol,
                type: 'stock'
            };
            await redisService.publish('system:subscription_updates', JSON.stringify(event));
            console.log(`[SERVICE] Strategy ${strategyId} stopped. Last session for ${symbol} cleaned up.`);
        }

        return { count, symbol };
    }
};
