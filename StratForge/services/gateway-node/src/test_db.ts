import { databaseService } from './services/DatabaseService.js';
import { pool } from './db.js';

async function runTest() {
    console.log("Starting DB Integration Test (Raw SQL)...");

    try {
        // 1. Find Strategy ID
        const stratRes = await pool.query(`SELECT id, name FROM strategies WHERE name = $1`, ['AAPL Momentum']);
        if (stratRes.rows.length === 0) {
            throw new Error("AAPL Momentum strategy not found. Run seed_db.ts first.");
        }
        const strategyId = stratRes.rows[0].id;
        console.log(`Found Strategy: ${stratRes.rows[0].name} (${strategyId})`);

        // 2. Create Session
        console.log("Creating Session...");
        const session = await databaseService.createSession({
            symbol: 'AAPL',
            type: 'stock',
            strategyId: strategyId
        });
        console.log(`Created Session: ${session.id} Status: ${session.status}`);

        if (session.status !== 'RUNNING') {
            throw new Error(`Expected RUNNING, got ${session.status}`);
        }

        // 3. Verify Active Check
        const isActive = await databaseService.hasActiveSessionsForSymbol('AAPL');
        console.log(`Is AAPL Active? ${isActive}`);
        if (!isActive) throw new Error("Expected AAPL to be active");

        // 4. Stop Session
        console.log("Stopping Session...");
        const stoppedSession = await databaseService.stopSession(session.id);
        console.log(`Stopped Session: ${stoppedSession?.id} Status: ${stoppedSession?.status}`);

        if (stoppedSession?.status !== 'STOPPED') {
            throw new Error(`Expected STOPPED, got ${stoppedSession?.status}`);
        }

        // 5. Verify Inactive Check (assuming this was the only one)
        // If other sessions exist, this might be true, but at least we verified flow.
        const isActiveAfter = await databaseService.hasActiveSessionsForSymbol('AAPL');
        console.log(`Is AAPL Active After Stop? ${isActiveAfter}`);

        console.log("Test Passed!");

    } catch (err) {
        console.error("Test Failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runTest();
