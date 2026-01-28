import { pool } from './db.js';

async function main() {
    console.log("Seeding Database (Raw SQL)...");

    try {
        // 1. Create Default User (Upsert via ON CONFLICT)
        const userRes = await pool.query(
            `INSERT INTO users (email, username, password_hash)
             VALUES ($1, $2, $3)
             ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
             RETURNING id`,
            ['admin@stratforge.com', 'admin', 'hashed_secret']
        );
        const userId = userRes.rows[0].id;
        console.log(`User confirmed: ${userId}`);

        // 2. Create Stock Strategy (AAPL)
        // Check if exists first (simple way)
        let stockStratRes = await pool.query(`SELECT id FROM strategies WHERE name = $1`, ['AAPL Momentum']);
        let stockStratId;

        if (stockStratRes.rows.length === 0) {
            const insert = await pool.query(
                `INSERT INTO strategies (name, symbol, user_id, python_code, logic_explanation)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                ['AAPL Momentum', 'AAPL', userId, 'print("BUY AAPL")', 'Simple Moving Average Crossover']
            );
            stockStratId = insert.rows[0].id;
        } else {
            stockStratId = stockStratRes.rows[0].id;
        }
        console.log(`Strategy Verified: [AAPL Momentum] ID: ${stockStratId}`);

        // 3. Create Crypto Strategy (ETH/USD)
        let cryptoStratRes = await pool.query(`SELECT id FROM strategies WHERE name = $1`, ['ETH Scalper']);
        let cryptoStratId;

        if (cryptoStratRes.rows.length === 0) {
            const insert = await pool.query(
                `INSERT INTO strategies (name, symbol, user_id, python_code, logic_explanation)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                ['ETH Scalper', 'ETH/USD', userId, 'print("BUY ETH")', 'RSI Divergence']
            );
            cryptoStratId = insert.rows[0].id;
        } else {
            cryptoStratId = cryptoStratRes.rows[0].id;
        }
        console.log(`Strategy Verified: [ETH Scalper] ID: ${cryptoStratId}`);

    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
