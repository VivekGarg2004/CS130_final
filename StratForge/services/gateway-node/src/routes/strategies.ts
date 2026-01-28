import { Router } from 'express';
import { StrategyController } from '../controllers/strategyController.js';
import { StrategyService } from '../services/strategyService.js';
import { StrategyRepository } from '../repositories/strategyRepository.js';

export const createStrategyRouter = (): Router => {
    const router = Router();

    const repository = new StrategyRepository();
    const service = new StrategyService(repository);
    const controller = new StrategyController(service);

    router.get('/', controller.listStrategies);
    router.post('/', controller.createStrategy);
    router.patch('/:id', controller.updateStrategy);
    router.delete('/:id', controller.deleteStrategy);

    return router;
};

