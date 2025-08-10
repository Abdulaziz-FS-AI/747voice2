# Phone Number VAPI Integration Mapping

## Frontend Form → Backend → VAPI Flow

### 1. Frontend Form Fields (`add-phone-number-modal.tsx`)

```typescript
{
  friendlyName: string,          // "Main Sales Line"
  phoneNumber: string,           // "+14155551234" (E.164 format)
  twilioAccountSid: string,      // "ACxxxxx..." (32 chars)
  twilioAuthToken: string,       // Twilio auth token
  assignedAssistantId?: string,  //  assistant UUID
  notes?: string                 // Optional notes
}
```

### 2. Backend Processing (`/api/phone-numbers/route.ts`)

```typescript
// Validated data structure
{
  phoneNumber: string,           // Validated E.164 format
  friendlyName: string,          // 1-255 chars
  twilioAccountSid: string,      // Validated format
  twilioAuthToken: string,       // Min 32 chars
  assistantId?: string | null    // UUID or null
}
```

### 3. Phone Number Service (`phone-number.service.ts`)

The service:
1. Validates input data
2. Checks for existing phone numbers
3. Gets assistant's VAPI ID if assigned
4. Creates phone number in VAPI
5. Stores in database with VAPI IDs

### 4. VAPI API Payload

```typescript
{
  provider: "twilio",
  number: "+14155551234",
  twilioAccountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  twilioAuthToken: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  name: "Main Sales Line",
  assistantId: "aafd4a02-523b-4675-8341-cfcc9b7a9a04" 
  }
```

### 5. Database Storage (`phone_numbers` table)

```sql
{
  id: UUID,
  user_id: UUID,
  phone_number: "+14155551234",
  friendly_name: "Main Sales Line",
  provider: "twilio",
  vapi_phone_id: "abc123...",          -- From VAPI response
  vapi_credential_id: "cred123...",    -- From VAPI response
  twilio_account_sid: "ACxxxxx...",
  twilio_auth_token: "encrypted...",   -- Should be encrypted
  assigned_assistant_id: UUID ,
  created_at: timestamp,
  updated_at: timestamp
}
```

## Key Points

1. **Phone Number Format**: Must be E.164 format (e.g., `+14155551234`)
2. **Twilio Credentials**: User provides their own Twilio account credentials
3. **Assistant Assignment**:  d
4. **VAPI Response**: Returns `id` and `credentialId` which must be stored
5. **Webhook**: Optional server configuration for call events

## Error Handling

- **400 Bad Request**: Invalid phone format or phone already in use
- **401 Unauthorized**: Invalid VAPI API key
- **403 Forbidden**: User lacks permission to manage phone numbers
- **409 Conflict**: Phone number already exists for user

## Security Considerations

1. **Credential Storage**: Twilio auth tokens should be encrypted in production
2. **Phone Masking**: Log phone numbers with last 4 digits masked
3. **Validation**: Strict E.164 format validation
4. **Permissions**: Users can only manage their own phone numbers