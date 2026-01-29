import { Request, Response } from 'express';
import { sessionService } from '../services/SessionService.js';

export class SessionController {
    static async create(req: Request, res: Response): Promise<void> {
        const { symbol, type, strategyId } = req.body;

        if (!symbol || !strategyId) {
            res.status(400).json({ error: 'Symbol and Strategy ID are required' });
            return;
        }

        try {
            const result = await sessionService.startSession({ symbol, type, strategyId });

            res.status(201).json({
                message: 'Session started',
                data: result
            });
        } catch (err) {
            console.error("Failed to start session:", err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async stop(req: Request, res: Response): Promise<void> {
        const id = req.params.id as string;

        try {
            const session = await sessionService.stopSession(id);

            if (!session) {
                res.status(404).json({ error: 'Session not found' });
                return;
            }

            res.status(200).json({ message: 'Session stopped', sessionId: id });

        } catch (err) {
            console.error("Failed to stop session:", err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
