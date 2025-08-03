-- Test the absolute minimum insert to see what's causing the phone number query

-- First, let's see if we can insert manually with minimal data
DO $$
DECLARE
    test_user_id uuid := '00000000-0000-0000-0000-000000000001';
    new_assistant_id uuid;
BEGIN
    -- Try the most basic insert possible
    INSERT INTO user_assistants (
        user_id,
        name,
        personality
    ) VALUES (
        test_user_id,
        'Test Assistant',
        'professional'
    ) RETURNING id INTO new_assistant_id;
    
    RAISE NOTICE 'SUCCESS: Basic insert worked, assistant ID: %', new_assistant_id;
    
    -- Clean up the test
    DELETE FROM user_assistants WHERE id = new_assistant_id;
    RAISE NOTICE 'Test assistant cleaned up';
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR during basic insert: %', SQLERRM;
END
$$;

-- If that works, try with config
DO $$
DECLARE
    test_user_id uuid := '00000000-0000-0000-0000-000000000002';
    new_assistant_id uuid;
BEGIN
    INSERT INTO user_assistants (
        user_id,
        name,
        personality,
        config
    ) VALUES (
        test_user_id,
        'Test Assistant 2',
        'professional',
        '{"test": true}'::jsonb
    ) RETURNING id INTO new_assistant_id;
    
    RAISE NOTICE 'SUCCESS: Insert with config worked, assistant ID: %', new_assistant_id;
    
    -- Clean up
    DELETE FROM user_assistants WHERE id = new_assistant_id;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR during insert with config: %', SQLERRM;
END
$$;