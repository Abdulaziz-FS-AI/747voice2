-- Analytics functions for call tracking and reporting

-- Function to process call log and update analytics
CREATE OR REPLACE FUNCTION public.process_call_analytics(
  client_id_input uuid,
  assistant_id_input uuid,
  call_date date,
  duration_seconds_input integer DEFAULT 0,
  cost_cents_input integer DEFAULT 0,
  was_successful boolean DEFAULT true
)
RETURNS void AS $$
BEGIN
  -- Insert or update daily analytics
  INSERT INTO public.call_analytics (
    client_id,
    assistant_id,
    date,
    total_calls,
    successful_calls,
    failed_calls,
    total_duration_seconds,
    total_cost_cents
  )
  VALUES (
    client_id_input,
    assistant_id_input,
    call_date,
    1,
    CASE WHEN was_successful THEN 1 ELSE 0 END,
    CASE WHEN was_successful THEN 0 ELSE 1 END,
    duration_seconds_input,
    cost_cents_input
  )
  ON CONFLICT (client_id, assistant_id, date)
  DO UPDATE SET
    total_calls = call_analytics.total_calls + 1,
    successful_calls = call_analytics.successful_calls + (CASE WHEN was_successful THEN 1 ELSE 0 END),
    failed_calls = call_analytics.failed_calls + (CASE WHEN was_successful THEN 0 ELSE 1 END),
    total_duration_seconds = call_analytics.total_duration_seconds + duration_seconds_input,
    total_cost_cents = call_analytics.total_cost_cents + cost_cents_input,
    updated_at = timezone('utc'::text, now());
  
  -- Update calculated fields
  UPDATE public.call_analytics
  SET
    average_call_duration = CASE 
      WHEN total_calls > 0 THEN ROUND(total_duration_seconds::numeric / total_calls, 2)
      ELSE 0
    END,
    success_rate = CASE 
      WHEN total_calls > 0 THEN ROUND((successful_calls::numeric / total_calls) * 100, 2)
      ELSE 0
    END
  WHERE client_id = client_id_input 
    AND assistant_id = assistant_id_input 
    AND date = call_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client dashboard analytics
CREATE OR REPLACE FUNCTION public.get_client_analytics(
  client_id_input uuid,
  days_back integer DEFAULT 30
)
RETURNS TABLE(
  total_calls bigint,
  successful_calls bigint,
  failed_calls bigint,
  total_duration_hours numeric,
  total_cost_dollars numeric,
  average_call_duration numeric,
  success_rate numeric,
  calls_by_day jsonb,
  calls_by_assistant jsonb
) AS $$
DECLARE
  start_date date;
BEGIN
  start_date := CURRENT_DATE - (days_back || ' days')::interval;
  
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      ca.date,
      SUM(ca.total_calls) as day_calls,
      SUM(ca.successful_calls) as day_successful,
      SUM(ca.total_duration_seconds) as day_duration,
      SUM(ca.total_cost_cents) as day_cost
    FROM public.call_analytics ca
    WHERE ca.client_id = client_id_input 
      AND ca.date >= start_date
    GROUP BY ca.date
    ORDER BY ca.date
  ),
  assistant_stats AS (
    SELECT 
      cas.display_name,
      SUM(ca.total_calls) as assistant_calls,
      SUM(ca.successful_calls) as assistant_successful,
      SUM(ca.total_duration_seconds) as assistant_duration,
      SUM(ca.total_cost_cents) as assistant_cost
    FROM public.call_analytics ca
    JOIN public.client_assistants cas ON cas.id = ca.assistant_id
    WHERE ca.client_id = client_id_input 
      AND ca.date >= start_date
    GROUP BY cas.id, cas.display_name
    ORDER BY assistant_calls DESC
  ),
  totals AS (
    SELECT 
      COALESCE(SUM(ca.total_calls), 0) as total_calls,
      COALESCE(SUM(ca.successful_calls), 0) as successful_calls,
      COALESCE(SUM(ca.failed_calls), 0) as failed_calls,
      COALESCE(SUM(ca.total_duration_seconds), 0) as total_duration_seconds,
      COALESCE(SUM(ca.total_cost_cents), 0) as total_cost_cents
    FROM public.call_analytics ca
    WHERE ca.client_id = client_id_input 
      AND ca.date >= start_date
  )
  SELECT 
    t.total_calls,
    t.successful_calls,
    t.failed_calls,
    ROUND(t.total_duration_seconds::numeric / 3600, 2) as total_duration_hours,
    ROUND(t.total_cost_cents::numeric / 100, 2) as total_cost_dollars,
    CASE 
      WHEN t.total_calls > 0 THEN ROUND(t.total_duration_seconds::numeric / t.total_calls, 2)
      ELSE 0
    END as average_call_duration,
    CASE 
      WHEN t.total_calls > 0 THEN ROUND((t.successful_calls::numeric / t.total_calls) * 100, 2)
      ELSE 0
    END as success_rate,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', ds.date,
          'calls', ds.day_calls,
          'successful', ds.day_successful,
          'duration_minutes', ROUND(ds.day_duration::numeric / 60, 2),
          'cost_dollars', ROUND(ds.day_cost::numeric / 100, 2)
        )
      )
      FROM daily_stats ds
    ) as calls_by_day,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'assistant_name', ass.display_name,
          'calls', ass.assistant_calls,
          'successful', ass.assistant_successful,
          'duration_minutes', ROUND(ass.assistant_duration::numeric / 60, 2),
          'cost_dollars', ROUND(ass.assistant_cost::numeric / 100, 2)
        )
      )
      FROM assistant_stats ass
    ) as calls_by_assistant
  FROM totals t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  start_date date;
  assistant_name_var text;
BEGIN
  start_date := CURRENT_DATE - (days_back || ' days')::interval;
  
  -- Get assistant name
  SELECT display_name INTO assistant_name_var
  FROM public.client_assistants
  WHERE id = assistant_id_input AND client_id = client_id_input;
  
  IF assistant_name_var IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH daily_breakdown AS (
    SELECT 
      ca.date,
      ca.total_calls,
      ca.successful_calls,
      ca.failed_calls,
      ca.total_duration_seconds,
      ca.total_cost_cents,
      ca.average_call_duration,
      ca.success_rate
    FROM public.call_analytics ca
    WHERE ca.client_id = client_id_input 
      AND ca.assistant_id = assistant_id_input
      AND ca.date >= start_date
    ORDER BY ca.date DESC
  ),
  recent_calls AS (
    SELECT 
      cl.call_time,
      cl.duration_seconds,
      cl.cost,
      cl.caller_number,
      cl.success_evaluation,
      cl.call_status
    FROM public.call_logs cl
    WHERE cl.client_id = client_id_input 
      AND cl.assistant_id = assistant_id_input
      AND cl.call_time >= start_date::timestamp
    ORDER BY cl.call_time DESC
    LIMIT 20
  ),
  totals AS (
    SELECT 
      COALESCE(SUM(ca.total_calls), 0) as total_calls,
      COALESCE(SUM(ca.successful_calls), 0) as successful_calls,
      COALESCE(SUM(ca.failed_calls), 0) as failed_calls,
      COALESCE(SUM(ca.total_duration_seconds), 0) as total_duration_seconds,
      COALESCE(SUM(ca.total_cost_cents), 0) as total_cost_cents
    FROM public.call_analytics ca
    WHERE ca.client_id = client_id_input 
      AND ca.assistant_id = assistant_id_input
      AND ca.date >= start_date
  )
  SELECT 
    assistant_name_var,
    t.total_calls,
    t.successful_calls,
    t.failed_calls,
    ROUND(t.total_duration_seconds::numeric / 3600, 2) as total_duration_hours,
    ROUND(t.total_cost_cents::numeric / 100, 2) as total_cost_dollars,
    CASE 
      WHEN t.total_calls > 0 THEN ROUND(t.total_duration_seconds::numeric / t.total_calls, 2)
      ELSE 0
    END as average_call_duration,
    CASE 
      WHEN t.total_calls > 0 THEN ROUND((t.successful_calls::numeric / t.total_calls) * 100, 2)
      ELSE 0
    END as success_rate,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', db.date,
          'calls', db.total_calls,
          'successful', db.successful_calls,
          'failed', db.failed_calls,
          'duration_minutes', ROUND(db.total_duration_seconds::numeric / 60, 2),
          'cost_dollars', ROUND(db.total_cost_cents::numeric / 100, 2),
          'avg_duration', db.average_call_duration,
          'success_rate', db.success_rate
        )
      )
      FROM daily_breakdown db
    ) as daily_breakdown,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'call_time', rc.call_time,
          'duration_seconds', rc.duration_seconds,
          'cost_dollars', ROUND(rc.cost::numeric, 2),
          'caller_number', rc.caller_number,
          'success_evaluation', rc.success_evaluation,
          'call_status', rc.call_status
        )
      )
      FROM recent_calls rc
    ) as recent_calls
  FROM totals t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;