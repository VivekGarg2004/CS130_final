import { Response } from 'express';
import { pool } from '../db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { sessionService } from '../services/SessionService.js';

export class StrategyController {
    // Create a new strategy
    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { name, symbol, pythonCode, logicExplanation } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!name || !symbol || !pythonCode) {
            res.status(400).json({ error: 'Name, symbol, and pythonCode are required' });
            return;
        }

        // Basic validation: check for on_bar method
        if (!pythonCode.includes('def on_bar')) {
            res.status(400).json({
                error: 'Invalid strategy: must contain a def on_bar method'
            });
            return;
        }

        try {
            const result = await pool.query(
                `INSERT INTO strategies (user_id, name, symbol, python_code, logic_explanation)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, name, symbol, python_code, logic_explanation, created_at`,
                [userId, name, symbol.toUpperCase(), pythonCode, logicExplanation || null]
            );

            const strategy = result.rows[0];
            console.log(`[STRATEGY] Created strategy: ${strategy.name} (${strategy.id})`);

            res.status(201).json({
                message: 'Strategy created',
                strategy: {
                    id: strategy.id,
                    name: strategy.name,
                    symbol: strategy.symbol,
                    pythonCode: strategy.python_code,
                    logicExplanation: strategy.logic_explanation,
                    createdAt: strategy.created_at
                }
            });
        } catch (error) {
            console.error('[STRATEGY] Create error:', error);
            res.status(500).json({ error: 'Failed to create strategy' });
        }
    }

    // Get all strategies for current user
    static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            const result = await pool.query(
                `SELECT id, name, symbol, logic_explanation, created_at
                 FROM strategies
                 WHERE user_id = $1
                 ORDER BY created_at DESC`,
                [userId]
            );

            res.json({
                strategies: result.rows.map(s => ({
                    id: s.id,
                    name: s.name,
                    symbol: s.symbol,
                    logicExplanation: s.logic_explanation,
                    createdAt: s.created_at
                }))
            });
        } catch (error) {
            console.error('[STRATEGY] List error:', error);
            res.status(500).json({ error: 'Failed to fetch strategies' });
        }
    }

    // Get single strategy by ID
    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            const result = await pool.query(
                `SELECT id, name, symbol, python_code, logic_explanation, created_at
                 FROM strategies
                 WHERE id = $1 AND user_id = $2`,
                [id, userId]
            );

            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Strategy not found' });
                return;
            }

            const s = result.rows[0];
            res.json({
                strategy: {
                    id: s.id,
                    name: s.name,
                    symbol: s.symbol,
                    pythonCode: s.python_code,
                    logicExplanation: s.logic_explanation,
                    createdAt: s.created_at
                }
            });
        } catch (error) {
            console.error('[STRATEGY] Get error:', error);
            res.status(500).json({ error: 'Failed to fetch strategy' });
        }
    }

    // Update a strategy
    // TODO: ensure we do not update a strategy that is currently running
    static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;
        const { name, symbol, pythonCode, logicExplanation } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Validate pythonCode if provided
        if (pythonCode && !pythonCode.includes('def on_bar')) {
            res.status(400).json({
                error: 'Invalid strategy: must contain a def on_bar method'
            });
            return;
        }

        try {
            const result = await pool.query(
                `UPDATE strategies
                 SET name = COALESCE($1, name),
                     symbol = COALESCE($2, symbol),
                     python_code = COALESCE($3, python_code),
                     logic_explanation = COALESCE($4, logic_explanation)
                 WHERE id = $5 AND user_id = $6
                 RETURNING id, name, symbol, python_code, logic_explanation, created_at`,
                [name, symbol?.toUpperCase(), pythonCode, logicExplanation, id, userId]
            );

            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Strategy not found' });
                return;
            }

            const s = result.rows[0];
            res.json({
                message: 'Strategy updated',
                strategy: {
                    id: s.id,
                    name: s.name,
                    symbol: s.symbol,
                    pythonCode: s.python_code,
                    logicExplanation: s.logic_explanation,
                    createdAt: s.created_at
                }
            });
        } catch (error) {
            console.error('[STRATEGY] Update error:', error);
            res.status(500).json({ error: 'Failed to update strategy' });
        }
    }

    // Stop all running sessions for a strategy

    // TODO: ensure that when we stop sessions we also send a stop to the python workers (polling vs event driven)
    static async stopSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            // Verify strategy belongs to user
            const strategyCheck = await pool.query(
                `SELECT id FROM strategies WHERE id = $1 AND user_id = $2`,
                [id, userId]
            );

            if (strategyCheck.rows.length === 0) {
                res.status(404).json({ error: 'Strategy not found' });
                return;
            }

            // Centralized session stopping via SessionService
            const { count } = await sessionService.stopStrategySessions(id as string);

            res.json({
                message: 'Sessions stopped',
                strategyId: id,
                sessionsStopped: count
            });
        } catch (error) {
            console.error('[STRATEGY] Stop sessions error:', error);
            res.status(500).json({ error: 'Failed to stop sessions' });
        }
    }

    // Delete a strategy
    // TODO: figure out way to stop the dynamic python worker that is running the strategy
    static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            // 1. First, verify the strategy exists and belongs to this user
            const strategyCheck = await pool.query(
                `SELECT id, symbol FROM strategies WHERE id = $1 AND user_id = $2`,
                [id, userId]
            );

            if (strategyCheck.rows.length === 0) {
                res.status(404).json({ error: 'Strategy not found' });
                return;
            }

            const strategySymbol = strategyCheck.rows[0].symbol;
            console.log(`[STRATEGY] Deleting strategy ${id} (symbol: ${strategySymbol})`);

            // 2. Stop all running sessions via centralized service
            const { count } = await sessionService.stopStrategySessions(id as string);

            console.log(`[STRATEGY] Stopped ${count} sessions during deletion`);

            // 3. Delete the strategy
            await pool.query(
                `DELETE FROM strategies WHERE id = $1 AND user_id = $2`,
                [id, userId]
            );

            console.log(`[STRATEGY] Deleted strategy ${id}`);
            res.json({ message: 'Strategy deleted', id, sessionsStopped: count });
        } catch (error) {
            console.error('[STRATEGY] Delete error:', error);
            res.status(500).json({ error: 'Failed to delete strategy' });
        }
    }
}
