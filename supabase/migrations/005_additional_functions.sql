-- Additional helper functions for the PIN-based system

-- Function to get recent calls for dashboard
CREATE OR REPLACE FUNCTION public.get_recent_calls(
  client_id_input uuid,
  limit_rows integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  call_time timestamp with time zone,
  duration_seconds integer,
  cost numeric,
  caller_number text,
  call_status text,
  assistant_display_name text,
  success_evaluation boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.call_time,
    cl.duration_seconds,
    cl.cost,
    cl.caller_number,
    cl.call_status,
    cl.assistant_display_name,
    cl.success_evaluation
  FROM public.call_logs cl
  WHERE cl.client_id = client_id_input
  ORDER BY cl.call_time DESC
  LIMIT limit_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard analytics with proper field references
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(
  client_id_input uuid,
  days_back integer DEFAULT 30
)
RETURNS TABLE(
  total_calls bigint,
  total_duration_hours numeric,
  avg_duration_minutes numeric,
  success_rate numeric,
  recent_calls jsonb
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
      COALESCE(
        SUM(CASE WHEN call_status = 'completed' THEN 1 ELSE 0 END)::numeric / 
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
        'assistant_display_name', cl.assistant_display_name
      ) ORDER BY cl.call_time DESC
    ) as recent_calls
    FROM (
      SELECT * FROM public.call_logs
      WHERE client_id = client_id_input
      ORDER BY call_time DESC
      LIMIT 10
    ) cl
  )
  SELECT 
    cs.total_calls,
    ROUND(cs.total_duration_seconds::numeric / 3600, 2) as total_duration_hours,
    ROUND(cs.avg_duration_seconds::numeric / 60, 2) as avg_duration_minutes,
    ROUND(cs.success_rate, 2) as success_rate,
    r.recent_calls
  FROM call_stats cs, recent r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log webhook data from VAPI
CREATE OR REPLACE FUNCTION public.log_vapi_call(
  vapi_call_id_input text,
  client_id_input uuid,
  assistant_id_input uuid,
  phone_number_id_input uuid DEFAULT NULL,
  caller_number_input text DEFAULT NULL,
  call_status_input text DEFAULT 'in_progress',
  duration_seconds_input integer DEFAULT 0,
  cost_input numeric DEFAULT 0,
  transcript_input text DEFAULT NULL,
  recording_url_input text DEFAULT NULL,
  success_evaluation_input boolean DEFAULT NULL,
  summary_input text DEFAULT NULL,
  structured_data_input jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  call_log_id uuid;
  assistant_name text;
BEGIN
  -- Get assistant display name for caching
  SELECT display_name INTO assistant_name
  FROM public.client_assistants
  WHERE id = assistant_id_input;
  
  -- Insert or update call log
  INSERT INTO public.call_logs (
    vapi_call_id,
    client_id,
    assistant_id,
    phone_number_id,
    caller_number,
    call_status,
    duration_seconds,
    cost,
    transcript,
    recording_url,
    success_evaluation,
    summary,
    structured_data,
    assistant_display_name
  ) VALUES (
    vapi_call_id_input,
    client_id_input,
    assistant_id_input,
    phone_number_id_input,
    caller_number_input,
    call_status_input,
    duration_seconds_input,
    cost_input,
    transcript_input,
    recording_url_input,
    success_evaluation_input,
    summary_input,
    structured_data_input,
    assistant_name
  )
  ON CONFLICT (vapi_call_id) DO UPDATE SET
    call_status = EXCLUDED.call_status,
    duration_seconds = EXCLUDED.duration_seconds,
    cost = EXCLUDED.cost,
    transcript = COALESCE(EXCLUDED.transcript, call_logs.transcript),
    recording_url = COALESCE(EXCLUDED.recording_url, call_logs.recording_url),
    success_evaluation = COALESCE(EXCLUDED.success_evaluation, call_logs.success_evaluation),
    summary = COALESCE(EXCLUDED.summary, call_logs.summary),
    structured_data = call_logs.structured_data || EXCLUDED.structured_data,
    end_time = CASE 
      WHEN EXCLUDED.call_status IN ('completed', 'failed', 'cancelled') 
      THEN timezone('utc'::text, now()) 
      ELSE call_logs.end_time 
    END,
    updated_at = timezone('utc'::text, now())
  RETURNING id INTO call_log_id;
  
  -- Update analytics if call is completed
  IF call_status_input IN ('completed', 'failed', 'cancelled') THEN
    PERFORM public.process_call_analytics(
      client_id_input,
      assistant_id_input,
      CURRENT_DATE,
      duration_seconds_input,
      (cost_input * 100)::integer, -- Convert to cents
      COALESCE(success_evaluation_input, call_status_input = 'completed')
    );
  END IF;
  
  RETURN call_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client's total usage
CREATE OR REPLACE FUNCTION public.get_client_usage(
  client_id_input uuid,
  start_date_input date DEFAULT NULL,
  end_date_input date DEFAULT NULL
)
RETURNS TABLE(
  total_minutes numeric,
  total_cost numeric,
  total_calls bigint,
  average_call_minutes numeric,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(COALESCE(SUM(duration_seconds), 0)::numeric / 60, 2) as total_minutes,
    ROUND(COALESCE(SUM(cost), 0)::numeric, 2) as total_cost,
    COUNT(*) as total_calls,
    ROUND(COALESCE(AVG(duration_seconds), 0)::numeric / 60, 2) as average_call_minutes,
    ROUND(
      COALESCE(
        SUM(CASE WHEN success_evaluation = true THEN 1 ELSE 0 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100,
        0
      ), 
      2
    ) as success_rate
  FROM public.call_logs
  WHERE client_id = client_id_input
    AND (start_date_input IS NULL OR call_time::date >= start_date_input)
    AND (end_date_input IS NULL OR call_time::date <= end_date_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for new functions
GRANT EXECUTE ON FUNCTION public.get_recent_calls TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics TO anon;
GRANT EXECUTE ON FUNCTION public.log_vapi_call TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_usage TO anon;