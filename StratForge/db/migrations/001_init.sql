-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Strategies Table (Definition)
CREATE TABLE IF NOT EXISTS strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    python_code TEXT NOT NULL,
    logic_explanation TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);

-- Sessions Table (Executions & Portfolios)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Link session directly to user for "Default Layout"
    strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL, -- Nullable for Manual/Default sessions
    mode VARCHAR(10) CHECK (mode IN ('LIVE', 'PAPER', 'BACKTEST', 'MANUAL')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('RUNNING', 'STOPPED', 'FAILED', 'COMPLETED')) DEFAULT 'RUNNING',
    started_at TIMESTAMP DEFAULT now(),
    ended_at TIMESTAMP,
    final_pnl DECIMAL,
    state_metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_strategy_id ON sessions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Market Data Table (TimescaleDB ready structure)
CREATE TABLE IF NOT EXISTS market_data (
    time TIMESTAMP NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    open DECIMAL NOT NULL,
    high DECIMAL NOT NULL,
    low DECIMAL NOT NULL,
    close DECIMAL NOT NULL,
    volume BIGINT NOT NULL,
    PRIMARY KEY (time, symbol)
);

CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data(symbol);

-- Signals Table (The "Intent" to trade)
CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    action VARCHAR(4) CHECK (action IN ('BUY', 'SELL')),
    confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 1),
    generated_at TIMESTAMP DEFAULT now(),
    processed_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('PENDING', 'EXECUTED', 'REJECTED', 'EXPIRED')) DEFAULT 'PENDING',
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_signals_session_id ON signals(session_id);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);

-- Trades Table (The "Execution")
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES signals(id), -- Nullable if trade was manual
    symbol VARCHAR(10) NOT NULL,
    action VARCHAR(4) CHECK (action IN ('BUY', 'SELL')),
    price DECIMAL NOT NULL,
    quantity DECIMAL NOT NULL DEFAULT 1,
    executed_at TIMESTAMP DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_trades_session_id ON trades(session_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at);

-- Positions Table (Virtual Ledger)
-- Tracks the specific holdings of a single execution session (strategy instance)
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    quantity DECIMAL NOT NULL DEFAULT 0,
    average_entry_price DECIMAL NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT now(),
    UNIQUE(session_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_positions_session_id ON positions(session_id);
