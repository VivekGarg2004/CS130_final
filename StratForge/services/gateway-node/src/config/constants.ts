/**
 * Centralized constants for gateway-node
 * Prevents magic strings scattered throughout the codebase
 */

// Redis Pub/Sub Channels
export const REDIS_CHANNELS = {
    /** Control channel for session start/stop events (Worker listens) */
    SUBSCRIPTION_UPDATES: 'system:subscription_updates',
} as const;

// Redis Keys
export const REDIS_KEYS = {
    /** Prefix for active subscription sets by asset type */
    ACTIVE_SUBSCRIPTIONS: (type: 'stock' | 'crypto') => `active_subscriptions:${type}`,
} as const;

// Redis Streams
export const REDIS_STREAMS = {
    /** Trade signals from Python worker */
    TRADE_SIGNALS: 'trade_signals',
    /** Consumer group for trade execution */
    TRADE_SIGNALS_GROUP: 'gateway_group',
} as const;

// Session/Strategy Defaults
export const DEFAULTS = {
    /** Starting virtual balance for new users */
    INITIAL_BALANCE: 100000,
    /** Default asset type */
    ASSET_TYPE: 'stock' as const,
    /** Default session mode */
    SESSION_MODE: 'LIVE' as const,
} as const;

// Trade Status Values
export const TRADE_STATUS = {
    PENDING: 'PENDING',
    FILLED: 'FILLED',
    CANCELED: 'CANCELED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
} as const;

// Session Status Values
export const SESSION_STATUS = {
    RUNNING: 'RUNNING',
    STOPPED: 'STOPPED',
} as const;
