import { pool } from '../db/pool.js';
import type { StrategyCreateInput, StrategyRecord, StrategyUpdateInput } from '../models/strategy.js';
import { NotFoundError } from '../errors.js';

export class StrategyRepository {
    async createStrategy(input: StrategyCreateInput): Promise<StrategyRecord> {
        const result = await pool.query<StrategyRecord>(
            `
            INSERT INTO strategies (user_id, name, symbol, python_code, logic_explanation)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, name, symbol, python_code, logic_explanation, created_at
            `,
            [input.user_id, input.name, input.symbol, input.python_code, input.logic_explanation ?? null]
        );

        const created = result.rows[0];
        if (!created) {
            throw new Error('Failed to create strategy');
        }
        return created;
    }

    async listStrategies(userId?: string): Promise<StrategyRecord[]> {
        if (userId) {
            const result = await pool.query<StrategyRecord>(
                `
                SELECT id, user_id, name, symbol, python_code, logic_explanation, created_at
                FROM strategies
                WHERE user_id = $1
                ORDER BY created_at DESC
                `,
                [userId]
            );
            return result.rows;
        }

        const result = await pool.query<StrategyRecord>(
            `
            SELECT id, user_id, name, symbol, python_code, logic_explanation, created_at
            FROM strategies
            ORDER BY created_at DESC
            `
        );
        return result.rows;
    }

    async updateStrategy(input: StrategyUpdateInput): Promise<StrategyRecord> {
        const fields: string[] = [];
        const values: Array<string | null> = [];
        let index = 1;

        if (input.name !== undefined) {
            fields.push(`name = $${index++}`);
            values.push(input.name);
        }
        if (input.symbol !== undefined) {
            fields.push(`symbol = $${index++}`);
            values.push(input.symbol);
        }
        if (input.python_code !== undefined) {
            fields.push(`python_code = $${index++}`);
            values.push(input.python_code);
        }
        if (input.logic_explanation !== undefined) {
            fields.push(`logic_explanation = $${index++}`);
            values.push(input.logic_explanation ?? null);
        }

        const result = await pool.query<StrategyRecord>(
            `
            UPDATE strategies
            SET ${fields.join(', ')}
            WHERE id = $${index}
            RETURNING id, user_id, name, symbol, python_code, logic_explanation, created_at
            `,
            [...values, input.id]
        );

        const updated = result.rows[0];
        if (!updated) {
            throw new NotFoundError('Strategy not found');
        }

        return updated;
    }

    async deleteStrategy(id: string): Promise<StrategyRecord> {
        const result = await pool.query<StrategyRecord>(
            `
            DELETE FROM strategies
            WHERE id = $1
            RETURNING id, user_id, name, symbol, python_code, logic_explanation, created_at
            `,
            [id]
        );

        const deleted = result.rows[0];
        if (!deleted) {
            throw new NotFoundError('Strategy not found');
        }

        return deleted;
    }
}

