import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { JWT_SECRET, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d'; // 7 days

export class AuthController {
    static async register(req: Request, res: Response): Promise<void> {
        const { email, password, username } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        try {
            // Check if user already exists
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE email = $1 OR username = $2',
                [email, username || null]
            );

            if (existingUser.rows.length > 0) {
                res.status(409).json({ error: 'User with this email or username already exists' });
                return;
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

            // Create user
            const result = await pool.query(
                `INSERT INTO users (email, password_hash, username)
                 VALUES ($1, $2, $3)
                 RETURNING id, email, username, created_at`,
                [email, passwordHash, username || null]
            );

            const user = result.rows[0];
            console.log(`[AUTH] User registered: ${user.email}`);

            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username
                }
            });
        } catch (error) {
            console.error('[AUTH] Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }

    static async login(req: Request, res: Response): Promise<void> {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        try {
            // Find user
            const result = await pool.query(
                'SELECT id, email, username, password_hash FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            const user = result.rows[0];

            // Verify password
            const isValid = await bcrypt.compare(password, user.password_hash);

            if (!isValid) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Generate JWT
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    username: user.username
                },
                JWT_SECRET,
                { expiresIn: TOKEN_EXPIRY }
            );

            console.log(`[AUTH] User logged in: ${user.email}`);

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username
                }
            });
        } catch (error) {
            console.error('[AUTH] Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }

    static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const result = await pool.query(
                'SELECT id, email, username, created_at FROM users WHERE id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({ user: result.rows[0] });
        } catch (error) {
            console.error('[AUTH] Get user error:', error);
            res.status(500).json({ error: 'Failed to get user info' });
        }
    }
}
