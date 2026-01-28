import { StrategyRepository } from '../repositories/strategyRepository.js';
import type { StrategyCreateInput, StrategyRecord, StrategyUpdateInput } from '../models/strategy.js';
import { ValidationError } from '../errors.js';

const SYMBOL_REGEX = /^[A-Z0-9./-]{1,10}$/;

export class StrategyService {
    constructor(private readonly repository: StrategyRepository) { }

    async createStrategy(input: StrategyCreateInput): Promise<StrategyRecord> {
        const normalized = this.normalize(input);
        return this.repository.createStrategy(normalized);
    }

    async listStrategies(userId?: string): Promise<StrategyRecord[]> {
        return this.repository.listStrategies(userId);
    }

    async updateStrategy(input: StrategyUpdateInput): Promise<StrategyRecord> {
        const normalized = this.normalizeUpdate(input);
        return this.repository.updateStrategy(normalized);
    }

    async deleteStrategy(id: string): Promise<StrategyRecord> {
        return this.repository.deleteStrategy(id);
    }

    private normalize(input: StrategyCreateInput): StrategyCreateInput {
        const errors: Record<string, string> = {};

        const userId = input.user_id?.trim();
        if (!userId) errors.user_id = 'user_id is required';

        const name = input.name?.trim();
        if (!name) errors.name = 'name is required';

        const symbol = input.symbol?.trim().toUpperCase();
        if (!symbol) errors.symbol = 'symbol is required';
        else if (!SYMBOL_REGEX.test(symbol)) errors.symbol = 'symbol must be 1-10 chars (A-Z, 0-9, ./-)';

        const pythonCode = input.python_code?.trim();
        if (!pythonCode) errors.python_code = 'python_code is required';

        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Invalid strategy input', errors);
        }

        return {
            user_id: userId,
            name,
            symbol,
            python_code: pythonCode,
            logic_explanation: input.logic_explanation?.trim() || null
        };
    }

    private normalizeUpdate(input: StrategyUpdateInput): StrategyUpdateInput {
        const errors: Record<string, string> = {};

        if (!input.id?.trim()) {
            errors.id = 'id is required';
        }

        const normalized: StrategyUpdateInput = { id: input.id?.trim() || '' };

        if (input.name !== undefined) {
            const name = input.name?.trim();
            if (!name) errors.name = 'name cannot be empty';
            else normalized.name = name;
        }

        if (input.symbol !== undefined) {
            const symbol = input.symbol?.trim().toUpperCase();
            if (!symbol) errors.symbol = 'symbol cannot be empty';
            else if (!SYMBOL_REGEX.test(symbol)) errors.symbol = 'symbol must be 1-10 chars (A-Z, 0-9, ./-)';
            else normalized.symbol = symbol;
        }

        if (input.python_code !== undefined) {
            const pythonCode = input.python_code?.trim();
            if (!pythonCode) errors.python_code = 'python_code cannot be empty';
            else normalized.python_code = pythonCode;
        }

        if (input.logic_explanation !== undefined) {
            const logic = input.logic_explanation?.trim();
            normalized.logic_explanation = logic ? logic : null;
        }

        const hasUpdates = Object.keys(normalized).some((key) => key !== 'id');
        if (!hasUpdates) {
            errors.update = 'At least one field must be provided for update';
        }

        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Invalid strategy update input', errors);
        }

        return normalized;
    }
}

