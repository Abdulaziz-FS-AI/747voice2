-- Add sync tracking columns to assistants and phone numbers

-- Add sync metadata to user_assistants
ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'pending_deletion', 'deleted', 'error')),
ADD COLUMN IF NOT EXISTS sync_error TEXT DEFAULT NULL;

-- Add sync metadata to user_phone_numbers
ALTER TABLE user_phone_numbers
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'pending_deletion', 'deleted', 'error')),
ADD COLUMN IF NOT EXISTS sync_error TEXT DEFAULT NULL;

-- Create sync_events table for tracking sync history
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('manual_sync', 'webhook_sync', 'scheduled_sync')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('assistant', 'phone_number', 'all')),
  resource_id UUID DEFAULT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'synced', 'error')),
  details JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_events_user_id ON sync_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON sync_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_events_resource ON sync_events(resource_type, resource_id);

-- Create function to log sync events
CREATE OR REPLACE FUNCTION log_sync_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_action TEXT,
  p_details JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO sync_events (
    user_id,
    event_type,
    resource_type,
    resource_id,
    action,
    details,
    created_at
  ) VALUES (
    p_user_id,
    p_event_type,
    p_resource_type,
    p_resource_id,
    p_action,
    p_details,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON sync_events TO authenticated;
GRANT INSERT ON sync_events TO authenticated;

-- RLS policies
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync events" ON sync_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sync events" ON sync_events
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');