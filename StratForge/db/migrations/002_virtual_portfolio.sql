-- Migration: Add virtual portfolio support
-- Adds virtual_balance to users for simulated trading

ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_balance DECIMAL DEFAULT 100000.00;

-- Add user_id to trades for direct user tracking (bypasses session for simpler queries)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for faster user trade lookups
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);

-- Update existing trades to have user_id from their session (if any exist)
UPDATE trades t
SET user_id = s.user_id
FROM sessions s
WHERE t.session_id = s.id AND t.user_id IS NULL;
