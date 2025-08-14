-- Helper functions for webhook call logging and VAPI integration

-- Function to log VAPI call with automatic client lookup
CREATE OR REPLACE FUNCTION public.log_vapi_call(
  vapi_call_id_input text,
  vapi_assistant_id_input text,
  vapi_phone_id_input text DEFAULT NULL,
  caller_number_input text DEFAULT NULL,
  call_status_input text DEFAULT 'in_progress',
  call_type_input text DEFAULT 'inbound',
  duration_seconds_input integer DEFAULT 0,
  cost_input numeric DEFAULT 0,
  transcript_input text DEFAULT NULL,
  recording_url_input text DEFAULT NULL,
  success_evaluation_input boolean DEFAULT NULL,
  summary_input text DEFAULT NULL,
  structured_data_input jsonb DEFAULT '{}'::jsonb,
  call_time_input timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  call_log_id uuid,
  client_id uuid,
  message text
) AS $$
DECLARE
  found_client_id uuid;
  found_assistant_id uuid;
  found_phone_id uuid := NULL;
  assistant_name text;
  call_log_id uuid;
BEGIN
  -- Find client and assistant by VAPI assistant ID
  SELECT ca.client_id, ca.id, ca.display_name
  INTO found_client_id, found_assistant_id, assistant_name
  FROM public.client_assistants ca
  WHERE ca.vapi_assistant_id = vapi_assistant_id_input 
    AND ca.is_active = true;
  
  IF found_client_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 
      ('Assistant not found for VAPI ID: ' || vapi_assistant_id_input)::text;
    RETURN;
  END IF;
  
  -- Find phone number if provided
  IF vapi_phone_id_input IS NOT NULL THEN
    SELECT cpn.id INTO found_phone_id
    FROM public.client_phone_numbers cpn
    WHERE cpn.vapi_phone_id = vapi_phone_id_input
      AND cpn.client_id = found_client_id
      AND cpn.is_active = true;
  END IF;
  
  -- Insert or update call log
  INSERT INTO public.call_logs (
    vapi_call_id,
    client_id,
    assistant_id,
    phone_number_id,
    caller_number,
    call_status,
    call_type,
    call_time,
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
    found_client_id,
    found_assistant_id,
    found_phone_id,
    caller_number_input,
    call_status_input,
    call_type_input,
    COALESCE(call_time_input, timezone('utc'::text, now())),
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
  IF call_status_input IN ('completed', 'failed', 'cancelled') AND duration_seconds_input > 0 THEN
    PERFORM public.process_call_analytics(
      found_client_id,
      found_assistant_id,
      CURRENT_DATE,
      duration_seconds_input,
      (cost_input * 100)::integer, -- Convert to cents
      COALESCE(success_evaluation_input, call_status_input = 'completed')
    );
  END IF;
  
  RETURN QUERY SELECT true, call_log_id, found_client_id, 
    'Call logged successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client info by VAPI assistant ID (for webhook processing)
CREATE OR REPLACE FUNCTION public.get_client_by_vapi_assistant(vapi_assistant_id_input text)
RETURNS TABLE(
  client_id uuid,
  assistant_id uuid,
  company_name text,
  assistant_display_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.client_id,
    ca.id as assistant_id,
    c.company_name,
    ca.display_name as assistant_display_name
  FROM public.client_assistants ca
  JOIN public.clients c ON c.id = ca.client_id
  WHERE ca.vapi_assistant_id = vapi_assistant_id_input 
    AND ca.is_active = true
    AND c.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update call status (for real-time webhook updates)
CREATE OR REPLACE FUNCTION public.update_call_status(
  vapi_call_id_input text,
  status_input text
)
RETURNS boolean AS $$
DECLARE
  status_mapped text;
BEGIN
  -- Map VAPI status to our status values
  CASE status_input
    WHEN 'ended' THEN status_mapped := 'completed';
    WHEN 'completed' THEN status_mapped := 'completed';
    WHEN 'failed' THEN status_mapped := 'failed';
    WHEN 'error' THEN status_mapped := 'failed';
    WHEN 'cancelled' THEN status_mapped := 'cancelled';
    WHEN 'canceled' THEN status_mapped := 'cancelled';
    ELSE status_mapped := 'in_progress';
  END CASE;
  
  UPDATE public.call_logs 
  SET 
    call_status = status_mapped,
    updated_at = timezone('utc'::text, now())
  WHERE vapi_call_id = vapi_call_id_input;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to append transcript segment
CREATE OR REPLACE FUNCTION public.append_call_transcript(
  vapi_call_id_input text,
  transcript_segment_input text,
  speaker_input text DEFAULT 'user'
)
RETURNS boolean AS $$
DECLARE
  existing_transcript text;
  new_transcript text;
BEGIN
  -- Get existing transcript
  SELECT transcript INTO existing_transcript
  FROM public.call_logs
  WHERE vapi_call_id = vapi_call_id_input;
  
  IF existing_transcript IS NULL THEN
    existing_transcript := '';
  END IF;
  
  -- Append new segment with speaker label
  new_transcript := existing_transcript || 
    CASE WHEN existing_transcript = '' THEN '' ELSE E'\n' END ||
    speaker_input || ': ' || transcript_segment_input;
  
  UPDATE public.call_logs 
  SET 
    transcript = new_transcript,
    updated_at = timezone('utc'::text, now())
  WHERE vapi_call_id = vapi_call_id_input;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to anonymous role for webhook processing
GRANT EXECUTE ON FUNCTION public.log_vapi_call TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_by_vapi_assistant TO anon;
GRANT EXECUTE ON FUNCTION public.update_call_status TO anon;
GRANT EXECUTE ON FUNCTION public.append_call_transcript TO anon;