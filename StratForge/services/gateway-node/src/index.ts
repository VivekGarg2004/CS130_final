import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { createStrategyRouter } from './routes/strategies.js';
import { config } from './config.js';
import { NotFoundError, ValidationError } from './errors.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use('/api/strategies', createStrategyRouter());

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
        res.status(err.status).json({ error: err.message, details: err.details });
        return;
    }
    if (err instanceof NotFoundError) {
        res.status(err.status).json({ error: err.message });
        return;
    }

    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(config.port, () => {
    console.log(`Gateway API listening on port ${config.port}`);
});

