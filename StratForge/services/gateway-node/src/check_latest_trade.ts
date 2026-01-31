
import { pool } from './db.js';

async function checkLatestTrade() {
    const email = 'test@stratforge.com';

    try {
        const userResult = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
        const userId = userResult.rows[0].id;

        const tradeResult = await pool.query(
            `SELECT * FROM trades WHERE user_id = $1 ORDER BY executed_at DESC LIMIT 1`,
            [userId]
        );

        if (tradeResult.rows.length === 0) {
            console.log("No trades found.");
        } else {
            const trade = tradeResult.rows[0];
            console.log("\n--- Latest Trade ---");
            console.log(`Executed At:     ${trade.executed_at}`);
            console.log(`Symbol:          ${trade.symbol}`);
            console.log(`Action:          ${trade.action} ${trade.quantity} @ ${trade.price}`);
            console.log(`Alpaca Order ID: ${trade.alpaca_order_id}`);
            console.log(`Session ID:      ${trade.session_id}`);

            if (trade.alpaca_order_id) {
                console.log("\n✅ Success: Alpaca Order ID confirms execution via Alpaca engine.");
            } else {
                console.warn("\n❌ Warning: Alpaca Order ID is missing.");
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await pool.end();
    }
}

checkLatestTrade();
