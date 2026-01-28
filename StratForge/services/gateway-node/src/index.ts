import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import { redisService } from './services/RedisService.js';
import sessionRoutes from './routes/sessionRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/trade', tradeRoutes);

async function startServer() {
    try {
        // Connect to Redis
        await redisService.connect();

        app.listen(config.PORT, () => {
            console.log(`Gateway Service running on port ${config.PORT}`);
        });
    } catch (err) {
        console.error("Failed to start Gateway:", err);
        process.exit(1);
    }
}

startServer();
