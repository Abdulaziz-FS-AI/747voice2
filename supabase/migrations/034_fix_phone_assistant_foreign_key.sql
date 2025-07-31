-- Fix phone numbers foreign key to reference user_assistants instead of assistants
-- This matches the table structure used in the application

-- Drop the existing foreign key constraint
ALTER TABLE phone_numbers 
DROP CONSTRAINT IF EXISTS phone_numbers_assigned_assistant_id_fkey;

-- Add the correct foreign key constraint pointing to user_assistants
ALTER TABLE phone_numbers 
ADD CONSTRAINT phone_numbers_assigned_assistant_id_fkey 
FOREIGN KEY (assigned_assistant_id) 
REFERENCES user_assistants(id) 
ON DELETE SET NULL;

-- Verify the constraint was created properly
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'phone_numbers'
  AND kcu.column_name = 'assigned_assistant_id';