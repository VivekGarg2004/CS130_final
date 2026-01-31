
-- Migration to support manual trades and better tracking

-- 1. Make session_id nullable to support manual trades (which don't belong to a strategy session)
ALTER TABLE trades 
ALTER COLUMN session_id DROP NOT NULL;

-- 2. Add alpaca_order_id to track the external order ID
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS alpaca_order_id VARCHAR(255);
