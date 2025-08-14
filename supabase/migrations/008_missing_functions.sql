-- Missing critical functions for 100% operational system

-- Function to get assistant-specific analytics
CREATE OR REPLACE FUNCTION public.get_assistant_analytics(
  client_id_input uuid,
  assistant_id_input uuid,
  days_back integer DEFAULT 30
)
RETURNS TABLE(
  assistant_name text,
  total_calls bigint,
  successful_calls bigint,
  failed_calls bigint,
  total_duration_hours numeric,
  total_cost_dollars numeric,
  average_call_duration numeric,
  success_rate numeric,
  daily_breakdown jsonb,
  recent_calls jsonb
) AS $$
DECLARE
  start_date timestamp with time zone;
  assistant_name_var text;
BEGIN
  start_date := timezone('utc'::text, now()) - (days_back || ' days')::interval;
  
  -- Get assistant name
  SELECT display_name INTO assistant_name_var
  FROM public.client_assistants
  WHERE id = assistant_id_input AND client_id = client_id_input AND is_active = true;
  
  IF assistant_name_var IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH daily_breakdown AS (
    SELECT 
      DATE(cl.call_time) as call_date,
      COUNT(*) as day_calls,
      COUNT(CASE WHEN cl.success_evaluation = true THEN 1 END) as day_successful,
      COUNT(CASE WHEN cl.success_evaluation = false THEN 1 END) as day_failed,
      SUM(cl.duration_seconds) as day_duration,
      SUM(cl.cost) as day_cost
    FROM public.call_logs cl
    WHERE cl.client_id = client_id_input 
      AND cl.assistant_id = assistant_id_input
      AND cl.call_time >= start_date
    GROUP BY DATE(cl.call_time)
    ORDER BY call_date DESC
  ),
  recent_calls AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', cl.id,
        'call_time', cl.call_time,
        'duration_seconds', cl.duration_seconds,
        'cost', cl.cost,
        'caller_number', cl.caller_number,
        'success_evaluation', cl.success_evaluation,
        'call_status', cl.call_status,
        'transcript', LEFT(cl.transcript, 100)
      ) ORDER BY cl.call_time DESC
    ) as calls
    FROM (
      SELECT * FROM public.call_logs
      WHERE client_id = client_id_input 
        AND assistant_id = assistant_id_input
        AND call_time >= start_date
      ORDER BY call_time DESC
      LIMIT 20
    ) cl
  ),
  totals AS (
    SELECT 
      COUNT(*) as total_calls,
      COUNT(CASE WHEN cl.success_evaluation = true THEN 1 END) as successful_calls,
      COUNT(CASE WHEN cl.success_evaluation = false THEN 1 END) as failed_calls,
      COALESCE(SUM(cl.duration_seconds), 0) as total_duration_seconds,
      COALESCE(SUM(cl.cost), 0) as total_cost
    FROM public.call_logs cl
    WHERE cl.client_id = client_id_input 
      AND cl.assistant_id = assistant_id_input
      AND cl.call_time >= start_date
  )
  SELECT 
    assistant_name_var,
    t.total_calls,
    t.successful_calls,
    t.failed_calls,
    ROUND(t.total_duration_seconds::numeric / 3600, 2) as total_duration_hours,
    ROUND(t.total_cost::numeric, 2) as total_cost_dollars,
    CASE 
      WHEN t.total_calls > 0 THEN ROUND(t.total_duration_seconds::numeric / t.total_calls / 60, 2)
      ELSE 0
    END as average_call_duration,
    CASE 
      WHEN t.total_calls > 0 THEN ROUND((t.successful_calls::numeric / t.total_calls) * 100, 2)
      ELSE 0
    END as success_rate,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', db.call_date,
          'calls', db.day_calls,
          'successful', db.day_successful,
          'failed', db.day_failed,
          'duration_minutes', ROUND(db.day_duration::numeric / 60, 2),
          'cost_dollars', ROUND(db.day_cost::numeric, 2)
        )
      )
      FROM daily_breakdown db
    ) as daily_breakdown,
    rc.calls as recent_calls
  FROM totals t, recent_calls rc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced dashboard analytics function with proper cost calculation
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics_enhanced(
  client_id_input uuid,
  days_back integer DEFAULT 30
)
RETURNS TABLE(
  total_calls bigint,
  total_duration_hours numeric,
  avg_duration_minutes numeric,
  success_rate numeric,
  total_cost numeric,
  recent_calls jsonb,
  assistant_breakdown jsonb
) AS $$
DECLARE
  start_date timestamp with time zone;
BEGIN
  start_date := timezone('utc'::text, now()) - (days_back || ' days')::interval;
  
  RETURN QUERY
  WITH call_stats AS (
    SELECT 
      COUNT(*) as total_calls,
      COALESCE(SUM(duration_seconds), 0) as total_duration_seconds,
      COALESCE(AVG(duration_seconds), 0) as avg_duration_seconds,
      COALESCE(SUM(cost), 0) as total_cost,
      COALESCE(
        SUM(CASE WHEN success_evaluation = true THEN 1 ELSE 0 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 
        0
      ) as success_rate
    FROM public.call_logs
    WHERE client_id = client_id_input 
      AND call_time >= start_date
  ),
  recent AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', cl.id,
        'call_time', cl.call_time,
        'duration_seconds', cl.duration_seconds,
        'cost', cl.cost,
        'caller_number', cl.caller_number,
        'call_status', cl.call_status,
        'assistant_display_name', cl.assistant_display_name,
        'success_evaluation', cl.success_evaluation
      ) ORDER BY cl.call_time DESC
    ) as recent_calls
    FROM (
      SELECT * FROM public.call_logs
      WHERE client_id = client_id_input
        AND call_time >= start_date
      ORDER BY call_time DESC
      LIMIT 20
    ) cl
  ),
  assistant_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'assistant_name', ca.display_name,
        'total_calls', COALESCE(call_count.calls, 0),
        'total_cost', COALESCE(call_count.cost, 0),
        'success_rate', COALESCE(call_count.success_rate, 0)
      )
    ) as breakdown
    FROM public.client_assistants ca
    LEFT JOIN (
      SELECT 
        assistant_id,
        COUNT(*) as calls,
        SUM(cost) as cost,
        ROUND(
          (SUM(CASE WHEN success_evaluation = true THEN 1 ELSE 0 END)::numeric / 
           NULLIF(COUNT(*), 0)) * 100, 2
        ) as success_rate
      FROM public.call_logs
      WHERE client_id = client_id_input AND call_time >= start_date
      GROUP BY assistant_id
    ) call_count ON call_count.assistant_id = ca.id
    WHERE ca.client_id = client_id_input AND ca.is_active = true
  )
  SELECT 
    cs.total_calls,
    ROUND(cs.total_duration_seconds::numeric / 3600, 2) as total_duration_hours,
    ROUND(cs.avg_duration_seconds::numeric / 60, 2) as avg_duration_minutes,
    ROUND(cs.success_rate, 2) as success_rate,
    ROUND(cs.total_cost::numeric, 2) as total_cost,
    r.recent_calls,
    ast.breakdown as assistant_breakdown
  FROM call_stats cs, recent r, assistant_stats ast;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_assistant_analytics TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics_enhanced TO anon;