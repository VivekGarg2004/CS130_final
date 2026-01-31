
-- Migration to add status and type columns for Trade Reconciliation

-- 1. Add 'status' column (PENDING by default for new manual trades)
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'FILLED'; -- Existing trades are assumed filled

-- 2. Add 'type' column (MARKET by default)
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'MARKET';

-- 3. Update existing trades to be explicitly FILLED
UPDATE trades SET status = 'FILLED' WHERE status IS NULL;
UPDATE trades SET type = 'MARKET' WHERE type IS NULL;
