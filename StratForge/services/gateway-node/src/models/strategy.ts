export interface StrategyCreateInput {
    user_id: string;
    name: string;
    symbol: string;
    python_code: string;
    logic_explanation?: string | null;
}

export interface StrategyUpdateInput {
    id: string;
    name?: string;
    symbol?: string;
    python_code?: string;
    logic_explanation?: string | null;
}

export interface StrategyRecord {
    id: string;
    user_id: string;
    name: string;
    symbol: string;
    python_code: string;
    logic_explanation: string | null;
    created_at: Date;
}

