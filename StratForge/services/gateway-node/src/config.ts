import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const toNumber = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
    port: toNumber(process.env.PORT, 3000),
    databaseUrl: process.env.DATABASE_URL,
    pg: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: toNumber(process.env.POSTGRES_PORT, 5433),
        user: process.env.POSTGRES_USER || 'stratforge',
        password: process.env.POSTGRES_PASSWORD || 'changeme',
        database: process.env.POSTGRES_DB || 'stratforge',
        ssl: process.env.POSTGRES_SSL === 'true'
    }
};

