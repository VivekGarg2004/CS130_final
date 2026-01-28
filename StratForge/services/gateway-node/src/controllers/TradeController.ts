import { Request, Response } from 'express';
import { alpacaService } from '../services/AlpacaService.js';

export class TradeController {
    static async getAccount(req: Request, res: Response): Promise<void> {
        try {
            const account = await alpacaService.getAccount();
            res.json(account);
        } catch (err: any) {
            console.error("Alpaca Account Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    static async getPositions(req: Request, res: Response): Promise<void> {
        try {
            const positions = await alpacaService.getPositions();
            res.json(positions);
        } catch (err: any) {
            console.error("Alpaca Positions Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    static async placeOrder(req: Request, res: Response): Promise<void> {
        try {
            const { symbol, qty, side, type } = req.body;

            if (!symbol || !qty || !side) {
                res.status(400).json({ error: "Missing required fields: symbol, qty, side" });
                return;
            }

            const order = await alpacaService.placeOrder({
                symbol,
                qty: Number(qty),
                side,
                type: type || 'market',
                time_in_force: 'day'
            });

            res.status(201).json(order);
        } catch (err: any) {
            console.error("Alpaca Order Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    static async getOrders(req: Request, res: Response): Promise<void> {
        try {
            const status = (req.query.status as any) || 'all';
            const orders = await alpacaService.getOrders(status);
            res.json(orders);
        } catch (err: any) {
            console.error("Alpaca History Error:", err);
            res.status(500).json({ error: err.message });
        }
    }
}
