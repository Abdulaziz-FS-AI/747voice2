-- Add setup_completed field to profiles table
-- This field tracks whether a user has completed the initial signup flow
-- Users with existing accounts need to complete plan selection before accessing dashboard

ALTER TABLE profiles 
ADD COLUMN setup_completed BOOLEAN DEFAULT FALSE;

-- Update existing users to have setup_completed = true (they've already been using the platform)
UPDATE profiles 
SET setup_completed = TRUE 
WHERE created_at < NOW();

-- Create an index for faster queries
CREATE INDEX idx_profiles_setup_completed ON profiles(setup_completed);

-- Add a comment for documentation
COMMENT ON COLUMN profiles.setup_completed IS 'Tracks whether user has completed initial signup flow and plan selection';