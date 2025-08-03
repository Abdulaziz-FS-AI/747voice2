-- Check which fields are required (NOT NULL) in user_assistants
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_assistants'
AND is_nullable = 'NO'  -- NOT NULL fields
ORDER BY ordinal_position;