# Voice Matrix - Assistant Creation Guide

## Overview

Voice Matrix uses a sophisticated template-based system for creating AI voice assistants. This guide explains how the assistant creation process works, from the user's perspective to the technical implementation.

## System Architecture

### 1. **Prompt Template System**

The system uses dynamic prompt templates with placeholders that get filled with user-specific information:

```
You are {AGENT_NAME}, a professional real estate assistant working for {COMPANY_NAME}...
```

These placeholders are replaced with actual values when the user creates their assistant.

### 2. **User Customization Flow**

When creating an assistant, users provide:

- **Basic Information**
  - Assistant Name (e.g., "Sarah - Real Estate Assistant")
  - Agent Name (e.g., "Sarah") - The AI's persona
  - Company Name (e.g., "ABC Real Estate")

- **Personality Settings**
  - Tone: Professional, Friendly, or Casual
  - Custom Instructions (optional)

- **Voice Configuration**
  - Voice selection from available options
  - Max call duration
  - Language settings

- **Structured Questions**
  - Dynamic questions for data collection
  - Each question has:
    - Question text
    - Answer description
    - Field name (for data storage)
    - Type (string, number, boolean)
    - Required flag

### 3. **Prompt Generation Process**

The `PromptBuilder` class merges the template with user customizations:

1. Loads the base template for the industry (currently Real Estate)
2. Replaces placeholders with user values
3. Generates question collection instructions
4. Produces the final system prompt

### 4. **Vapi Integration**

Once the assistant is configured:

1. System generates structured data functions from questions
2. Creates assistant in Vapi with:
   - Generated system prompt
   - Voice configuration
   - Structured data collection functions
   - Webhook configuration
3. Stores Vapi assistant ID for future reference

## Database Schema

### Key Tables:

- **prompt_templates**: Stores base templates for different industries
- **assistants**: User-created assistants with customizations
- **assistant_questions**: Custom questions for each assistant
- **template_questions**: Default questions from templates

## API Endpoints

### Create Assistant
```
POST /api/assistants
{
  "name": "Sarah - Real Estate Assistant",
  "agentName": "Sarah",
  "companyName": "ABC Real Estate",
  "tone": "professional",
  "customInstructions": "Focus on luxury properties",
  "voiceId": "voice_professional_female_en",
  "maxCallDuration": 300,
  "questions": [
    {
      "questionText": "What is your full name?",
      "answerDescription": "Get the caller's complete name",
      "structuredFieldName": "full_name",
      "fieldType": "string",
      "isRequired": true,
      "displayOrder": 0
    }
  ]
}
```

### Get Templates
```
GET /api/templates
```

## Frontend Components

1. **CreateAssistantForm**: Multi-step wizard for assistant creation
2. **TemplateSelector**: Choose from available templates
3. **SystemPromptPreview**: Live preview of generated prompt
4. **Question Builder**: Dynamic form for adding/editing questions

## Usage Example

1. User navigates to `/assistants/new`
2. Selects "Real Estate Lead Qualifier" template
3. Fills in company information
4. Customizes questions (add/remove/edit)
5. Reviews generated system prompt
6. Creates assistant
7. System deploys to Vapi automatically

## Environment Setup

Required environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VAPI_API_KEY=your_vapi_api_key
VAPI_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_URL=http://localhost:3000
```

## Testing

1. Set up Supabase project
2. Run database migrations (including 006_prompt_templates.sql)
3. Configure environment variables
4. Start development server
5. Navigate to `/assistants/new`
6. Create a test assistant
7. Verify Vapi deployment

## Troubleshooting

- **Template not loading**: Check if migrations ran successfully
- **Vapi deployment fails**: Verify API key and network connectivity
- **Questions not saving**: Check database permissions and RLS policies