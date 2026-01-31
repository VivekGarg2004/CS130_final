import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import { redisService } from './services/RedisService.js';
import sessionRoutes from './routes/sessionRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import strategyRoutes from './routes/strategyRoutes.js';
import internalRoutes from './routes/internalRoutes.js';
import { tradeReconciliationService } from './services/TradeReconciliationService.js';

const app = express();

// Middleware
app.use(express.json({ limit: '1mb' })); // Increase limit for Python code
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/sessions', sessionRoutes);
app.use('/internal', internalRoutes);

async function startServer() {
    try {
        // Connect to Redis
        await redisService.connect();

        // Start Trade Reconciliation Service
        tradeReconciliationService.start();

        app.listen(config.PORT, () => {
            console.log(`Gateway Service running on port ${config.PORT}`);
        });
    } catch (err) {
        console.error("Failed to start Gateway:", err);
        process.exit(1);
    }
}

startServer();
