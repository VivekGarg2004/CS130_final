
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'stratforge',
    host: 'localhost',
    database: 'stratforge',
    password: 'changeme',
    port: 5433,
});

// Mock UUIDs
const USER_ID = '22fa174b-d0f4-4d4c-8b1a-b693b3505582'; // from previous curl output

async function run() {
    try {
        console.log("Connecting...");

        // 1. Create Strategy
        const stratRes = await pool.query(
            `INSERT INTO strategies (user_id, name, symbol, python_code, logic_explanation)
             VALUES ($1, 'Repro Strat', 'REPRO', 'def on_bar...', 'test')
             RETURNING id`,
            [USER_ID]
        );
        const stratId = stratRes.rows[0].id;
        console.log(`Created Strategy: ${stratId}`);

        // 2. Create Session
        const sessRes = await pool.query(
            `INSERT INTO sessions (strategy_id, user_id, mode, status, started_at)
             VALUES ($1, $2, 'LIVE', 'RUNNING', NOW())
             RETURNING id, status`,
            [stratId, USER_ID]
        );
        const sessId = sessRes.rows[0].id;
        console.log(`Created Session: ${sessId} (Status: ${sessRes.rows[0].status})`);

        // 3. Test Query (mimicking StrategyController)
        console.log(`Testing query with strategy_id=${stratId}`);
        const activeSessions = await pool.query(
            `SELECT id FROM sessions WHERE strategy_id = $1 AND status = 'RUNNING'`,
            [stratId]
        );
        console.log(`Query "WHERE strategy_id = '${stratId}' AND status = 'RUNNING'" returned ${activeSessions.rows.length} rows`);

        if (activeSessions.rows.length > 0) {
            console.log("SUCCESS: Found session.");
        } else {
            console.error("FAILURE: Did not find session.");
        }

        // Cleanup
        await pool.query('DELETE FROM strategies WHERE id = $1', [stratId]);
        console.log("Cleaned up.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

run();
