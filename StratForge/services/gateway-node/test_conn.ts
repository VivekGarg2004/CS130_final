import { Client } from 'pg';
import { createClient } from 'redis';

async function test(): Promise<void> {
    console.log('Testing Node.js Connectivity (TypeScript)...');

    // Redis
    const redisClient = createClient({
        url: 'redis://localhost:6379'
    });
    redisClient.on('error', (err: Error) => console.error('Redis Client Error', err));
    await redisClient.connect();
    await redisClient.set('key', 'value');
    const value = await redisClient.get('key');
    console.log('Redis Ping:', await redisClient.ping());
    console.log('Redis Key Check:', value === 'value' ? 'SUCCESS' : 'FAIL');
    await redisClient.disconnect();

    // Postgres
    const client = new Client({
        user: 'stratforge',
        host: 'localhost',
        database: 'stratforge',
        password: 'changeme',
        port: 5433,
    });
    await client.connect();

    // Insert dummy user structure check
    try {
        await client.query(`
          INSERT INTO users (email, password_hash, username) 
          VALUES ('test@example.com', 'hash', 'testuser') 
          ON CONFLICT (email) DO NOTHING
      `);
        console.log('User insertion check: SUCCESS');
    } catch (e: any) {
        console.error('User insertion check: FAILED', e.message);
    }

    // Insert dummy market data
    try {
        await client.query(`
          INSERT INTO market_data (time, symbol, open, high, low, close, volume)
          VALUES (NOW(), 'AAPL', 150.0, 155.0, 149.0, 152.0, 1000)
          ON CONFLICT (time, symbol) DO NOTHING
      `);
        console.log('Market Data insertion check: SUCCESS');
    } catch (e: any) {
        console.error('Market Data insertion check: FAILED', e.message);
    }

    // Insert Manual Session Check
    try {
        const userRes = await client.query("SELECT id FROM users WHERE email = 'test@example.com'");
        const userId = userRes.rows[0].id;

        await client.query(`
          INSERT INTO sessions (user_id, mode, status)
          VALUES ($1, 'MANUAL', 'RUNNING')
      `, [userId]);
        console.log('Manual Session creation check: SUCCESS');
    } catch (e: any) {
        console.error('Manual Session creation check: FAILED', e.message);
    }

    const res = await client.query('SELECT NOW()');
    console.log('Postgres Query Time:', res.rows[0].now);
    await client.end();
}

test().catch(console.error);
