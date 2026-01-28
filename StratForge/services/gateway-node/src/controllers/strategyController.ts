import type { Request, Response, NextFunction } from 'express';
import { StrategyService } from '../services/strategyService.js';

export class StrategyController {
    constructor(private readonly service: StrategyService) { }

    createStrategy = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const strategy = await this.service.createStrategy(req.body);
            res.status(201).json({ data: strategy });
        } catch (error) {
            next(error);
        }
    };

    listStrategies = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = typeof req.query.user_id === 'string' ? req.query.user_id : undefined;
            const strategies = await this.service.listStrategies(userId);
            res.status(200).json({ data: strategies });
        } catch (error) {
            next(error);
        }
    };

    updateStrategy = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const strategy = await this.service.updateStrategy({
                id: req.params.id,
                ...req.body
            });
            res.status(200).json({ data: strategy });
        } catch (error) {
            next(error);
        }
    };

    deleteStrategy = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const strategy = await this.service.deleteStrategy(req.params.id);
            res.status(200).json({ data: strategy });
        } catch (error) {
            next(error);
        }
    };
}

