import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
    PORT: process.env.GATEWAY_PORT || 3000,
    REDIS_URL: `redis://${process.env.REDIS_HOST === 'redis' ? 'localhost' : process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    POSTGRES: {
        HOST: process.env.POSTGRES_HOST,
        PORT: process.env.POSTGRES_PORT,
        USER: process.env.POSTGRES_USER,
        PASSWORD: process.env.POSTGRES_PASSWORD,
        DB: process.env.POSTGRES_DB
    }
};
