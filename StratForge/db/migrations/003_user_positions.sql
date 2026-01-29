-- Migration: Add virtual positions support
-- Adds user_id to positions table for direct user tracking (not session-based)

-- Add user_id column to positions if not exists
ALTER TABLE positions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create unique constraint on user_id + symbol for upserts
-- First drop the old constraint if exists
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_session_id_symbol_key;

-- Add new unique constraint for user-level positions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'positions_user_symbol_unique'
    ) THEN
        ALTER TABLE positions ADD CONSTRAINT positions_user_symbol_unique UNIQUE (user_id, symbol);
    END IF;
END $$;

-- Create index for faster user position lookups
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
