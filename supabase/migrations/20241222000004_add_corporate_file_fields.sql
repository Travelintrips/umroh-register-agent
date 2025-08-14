-- Add file upload fields for Corporate account types
ALTER TABLE users ADD COLUMN IF NOT EXISTS ktp_file_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS siup_file_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nib_file_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS npwp_file_url TEXT;

-- Add comments to the columns
COMMENT ON COLUMN users.ktp_file_url IS 'URL to KTP file for Corporate accounts';
COMMENT ON COLUMN users.siup_file_url IS 'URL to SIUP file for Corporate accounts';
COMMENT ON COLUMN users.nib_file_url IS 'URL to NIB file for Corporate accounts';
COMMENT ON COLUMN users.npwp_file_url IS 'URL to NPWP file for Corporate accounts';


