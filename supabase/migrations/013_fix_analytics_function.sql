-- Create the missing analytics function that the API is expecting
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics_enhanced(
  client_id_input uuid,
  days_back integer DEFAULT 30
)
RETURNS TABLE(
  total_calls bigint,
  success_rate numeric,
  avg_duration_minutes numeric,
  total_cost numeric,
  total_duration_hours numeric,
  recent_calls json
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_calls,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(CASE WHEN cl.success_evaluation = true THEN 1 END)::numeric / COUNT(*)::numeric * 100)
      ELSE 0
    END as success_rate,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (AVG(cl.duration_seconds) / 60)::numeric
      ELSE 0
    END as avg_duration_minutes,
    COALESCE(SUM(cl.cost), 0)::numeric as total_cost,
    COALESCE(SUM(cl.duration_seconds) / 3600, 0)::numeric as total_duration_hours,
    COALESCE(
      json_agg(
        json_build_object(
          'id', cl.id,
          'assistant_name', COALESCE(cl.assistant_display_name, 'Unknown'),
          'call_time', cl.call_time,
          'duration_seconds', cl.duration_seconds,
          'call_status', cl.call_status,
          'cost', cl.cost,
          'success', cl.success_evaluation
        ) ORDER BY cl.call_time DESC
      ) FILTER (WHERE cl.id IS NOT NULL), 
      '[]'::json
    ) as recent_calls
  FROM public.call_logs cl
  WHERE cl.client_id = client_id_input
    AND cl.call_time >= CURRENT_DATE - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics_enhanced TO service_role;