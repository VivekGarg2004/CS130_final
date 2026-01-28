import pg from 'pg';
import dotenv from 'dotenv';
// Load root .env if not already loaded
dotenv.config({ path: '../../.env' });

const { Pool } = pg;

export const pool = new Pool({
    host: 'localhost', // Force localhost for scripts running on host
    port: parseInt(process.env.POSTGRES_PORT || '5433'),
    database: process.env.POSTGRES_DB || 'stratforge',
    user: process.env.POSTGRES_USER || 'stratforge',
    password: process.env.POSTGRES_PASSWORD || 'changeme',
});

// Test connection
pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err);
    process.exit(-1);
});
