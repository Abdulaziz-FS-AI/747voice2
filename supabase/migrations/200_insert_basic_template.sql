-- Insert a basic template for assistant creation
-- This provides a simple starting point for users

INSERT INTO public.templates (
  id,
  name,
  description,
  base_prompt,
  customizable_fields,
  voice_settings,
  is_active
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Basic Assistant',
  'A simple, professional AI assistant template to get you started quickly',
  'You are a helpful AI assistant{COMPANY_NAME}. Your personality should be {PERSONALITY}. 

Key responsibilities:
- Answer questions clearly and professionally
- Be helpful and friendly
- Keep conversations focused and productive
- Maintain a {PERSONALITY} tone throughout

Always aim to provide accurate, helpful information while maintaining a conversational approach.',
  '{
    "COMPANY_NAME": {
      "type": "text",
      "label": "Company Name",
      "placeholder": "for [Your Company]",
      "required": false,
      "default": ""
    },
    "PERSONALITY": {
      "type": "select",
      "label": "Personality",
      "options": ["professional", "friendly", "casual"],
      "default": "professional",
      "required": true
    }
  }'::jsonb,
  '{
    "default_voice": "Elliot",
    "voice_options": ["Elliot", "Sarah", "Matthew", "Amy"],
    "speaking_rate": 1.0
  }'::jsonb,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_prompt = EXCLUDED.base_prompt,
  customizable_fields = EXCLUDED.customizable_fields,
  voice_settings = EXCLUDED.voice_settings,
  is_active = EXCLUDED.is_active;