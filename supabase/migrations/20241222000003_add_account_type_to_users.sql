-- Add account_type column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT;

-- Add a check constraint to ensure only valid values
ALTER TABLE users ADD CONSTRAINT check_account_type 
CHECK (account_type IN ('Personal', 'Corporate') OR account_type IS NULL);

-- Add comment to the column
COMMENT ON COLUMN users.account_type IS 'Type of account: Personal or Corporate';
