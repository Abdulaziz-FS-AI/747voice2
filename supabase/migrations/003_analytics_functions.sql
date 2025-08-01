-- Function to get daily usage for a user
CREATE OR REPLACE FUNCTION get_daily_usage(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  date DATE,
  minutes_used INTEGER,
  call_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(cl.started_at) as date,
    COALESCE(SUM(CEIL(cl.duration_seconds::NUMERIC / 60)), 0)::INTEGER as minutes_used,
    COUNT(*)::INTEGER as call_count
  FROM call_logs cl
  INNER JOIN user_assistants ua ON cl.assistant_id = ua.id
  WHERE ua.user_id = p_user_id
    AND cl.started_at >= p_start_date
  GROUP BY DATE(cl.started_at)
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get system-wide usage statistics
CREATE OR REPLACE FUNCTION get_system_usage_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_assistants BIGINT,
  total_minutes_used BIGINT,
  total_calls BIGINT,
  active_users_today BIGINT,
  calls_today BIGINT,
  minutes_today BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_users,
    (SELECT COUNT(*) FROM user_assistants)::BIGINT as total_assistants,
    (SELECT COALESCE(SUM(current_usage_minutes), 0) FROM profiles)::BIGINT as total_minutes_used,
    (SELECT COUNT(*) FROM call_logs)::BIGINT as total_calls,
    (SELECT COUNT(DISTINCT ua.user_id) 
     FROM call_logs cl 
     INNER JOIN user_assistants ua ON cl.assistant_id = ua.id
     WHERE DATE(cl.started_at) = CURRENT_DATE)::BIGINT as active_users_today,
    (SELECT COUNT(*) FROM call_logs WHERE DATE(started_at) = CURRENT_DATE)::BIGINT as calls_today,
    (SELECT COALESCE(SUM(CEIL(duration_seconds::NUMERIC / 60)), 0) 
     FROM call_logs 
     WHERE DATE(started_at) = CURRENT_DATE)::BIGINT as minutes_today;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate usage by time of day
CREATE OR REPLACE FUNCTION get_usage_by_hour(
  p_user_id UUID DEFAULT NULL,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  hour INTEGER,
  avg_calls NUMERIC,
  avg_minutes NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM cl.started_at)::INTEGER as hour,
    ROUND(AVG(daily_calls), 2) as avg_calls,
    ROUND(AVG(daily_minutes), 2) as avg_minutes
  FROM (
    SELECT 
      DATE(cl.started_at) as date,
      EXTRACT(HOUR FROM cl.started_at) as hour,
      COUNT(*) as daily_calls,
      SUM(CEIL(cl.duration_seconds::NUMERIC / 60)) as daily_minutes
    FROM call_logs cl
    INNER JOIN user_assistants ua ON cl.assistant_id = ua.id
    WHERE cl.started_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
      AND (p_user_id IS NULL OR ua.user_id = p_user_id)
    GROUP BY DATE(cl.started_at), EXTRACT(HOUR FROM cl.started_at)
  ) daily_data
  GROUP BY hour
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_daily_usage(UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_usage_stats() TO service_role;
GRANT EXECUTE ON FUNCTION get_usage_by_hour(UUID, INTEGER) TO authenticated;