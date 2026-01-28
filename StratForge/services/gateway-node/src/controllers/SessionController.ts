import { Request, Response } from 'express';
import { databaseService } from '../services/DatabaseService.js';
import { redisService } from '../services/RedisService.js';

export class SessionController {
    static async create(req: Request, res: Response): Promise<void> {
        const { symbol, type, strategyId } = req.body;

        if (!symbol || !strategyId) {
            res.status(400).json({ error: 'Symbol and Strategy ID are required' });
            return;
        }

        console.log(`[API] Starting session for ${symbol} (Strategy: ${strategyId})...`);

        try {
            // 1. Create Session
            const session = await databaseService.createSession({ symbol, type: type || 'stock', strategyId });

            // 2. Add to Redis Set (Persistence)
            const setKey = `active_subscriptions:${session.type}`;
            await redisService.addToSet(setKey, session.symbol);

            // 3. Publish Subscribe Event
            // Note: We always publish 'subscribe'. The Ingestor handles idempotency.
            const event = {
                action: 'subscribe',
                symbol: session.symbol,
                type: session.type
            };
            await redisService.publish('system:subscription_updates', JSON.stringify(event));

            console.log(`[CONTROL] Session Started. Subscribed to ${session.symbol}`);

            res.status(201).json({
                message: 'Session started',
                data: { session, event }
            });
        } catch (err) {
            console.error("Failed to start session:", err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async stop(req: Request, res: Response): Promise<void> {
        const id = req.params.id as string;

        console.log(`[API] Stopping session ${id}...`);

        try {
            // 1. Stop Session
            const session = await databaseService.stopSession(id);
            if (!session) {
                res.status(404).json({ error: 'Session not found' });
                return;
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
                console.log(`[CONTROL] Last session for ${session.symbol} stopped. Unsubscribing.`);
            } else {
                console.log(`[CONTROL] Session stopped, but ${session.symbol} is still needed by others.`);
            }

            res.status(200).json({ message: 'Session stopped', sessionId: id });

        } catch (err) {
            console.error("Failed to stop session:", err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
