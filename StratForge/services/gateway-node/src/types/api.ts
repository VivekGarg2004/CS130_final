/**
 * Shared TypeScript interfaces for API requests/responses
 * Replaces 'any' types throughout the codebase
 */

// ============================================
// Session Types
// ============================================

export interface StartSessionRequest {
    symbol: string;
    strategyId: string;
    type?: 'stock' | 'crypto';
}

export interface SessionResponse {
    id: string;
    symbol: string;
    type: 'stock' | 'crypto';
    strategyId: string;
    status: 'RUNNING' | 'STOPPED';
    createdAt: Date;
}

export interface SubscriptionEvent {
    action: 'subscribe' | 'unsubscribe';
    symbol: string;
    type: 'stock' | 'crypto';
    strategyId: string;
    sessionId: string;
}

// ============================================
// Trade Types
// ============================================

export interface PlaceOrderRequest {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type?: 'market' | 'limit';
    limit_price?: number;
    time_in_force?: 'day' | 'gtc' | 'ioc';
    sessionId?: string;
    signalId?: string;
}

export interface TradeRecord {
    id: string;
    userId: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    status: 'PENDING' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
    alpacaOrderId?: string;
    sessionId?: string;
    signalId?: string;
    executedAt: Date;
}

export interface TradeSignal {
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    sessionId: string;
    signalId: string;
}

// ============================================
// Portfolio Types
// ============================================

export interface Position {
    symbol: string;
    quantity: number;
    avgEntryPrice: number;
    currentPrice?: number;
    marketValue?: number;
    unrealizedPl?: number;
}

export interface PortfolioSummary {
    cashBalance: number;
    portfolioValue: number;
    pnl: number;
    positions: Position[];
}

// ============================================
// Strategy Types
// ============================================

export interface Strategy {
    id: string;
    userId: string;
    name: string;
    symbol: string;
    description?: string;
    code: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateStrategyRequest {
    name: string;
    symbol: string;
    description?: string;
    code: string;
}

// ============================================
// Auth Types
// ============================================

export interface RegisterRequest {
    email: string;
    password: string;
    username?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        username?: string;
    };
}

export interface JWTPayload {
    id: string;
    email: string;
}
