# VOICE MATRIX - FINAL LIMITS IMPLEMENTATION
## Smart Usage Control with Progressive Warnings

### 🎯 REQUIREMENTS SUMMARY
1. **Progressive Warnings** at 8 minutes usage
2. **Usage from call_logs** table (duration_seconds field)
3. **Auto-update VAPI** when 10 min limit reached
4. **Store original config** for monthly reset
5. **Reset from signup date** (not calendar month)
6. **No email notifications** (UI only)

---

## PHASE 1: USAGE CALCULATION FROM CALL LOGS

### Step 1.1: Create Usage Calculation Function
```typescript
// src/lib/services/usage-calculator.ts
export async function calculateUserUsage(userId: string): Promise<{
  totalMinutes: number;
  callCount: number;
  lastCallDate: Date | null;
}> {
  const supabase = createServiceRoleClient('usage_calculation')
  
  // Get user's billing cycle
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, billing_cycle_start')
    .eq('id', userId)
    .single()
  
  // Calculate start of current billing period
  const cycleStart = calculateCurrentCycleStart(profile.created_at)
  
  // Sum usage from call_logs since cycle start
  const { data: usage } = await supabase
    .from('call_logs')
    .select('duration_seconds')
    .eq('user_id', userId)
    .gte('created_at', cycleStart.toISOString())
    .not('duration_seconds', 'is', null)
  
  const totalSeconds = usage?.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) || 0
  const totalMinutes = Math.ceil(totalSeconds / 60) // Round up to nearest minute
  
  return {
    totalMinutes,
    callCount: usage?.length || 0,
    lastCallDate: usage?.[0]?.created_at ? new Date(usage[0].created_at) : null
  }
}

function calculateCurrentCycleStart(userCreatedAt: string): Date {
  const created = new Date(userCreatedAt)
  const now = new Date()
  
  // Find the most recent monthly anniversary
  let cycleStart = new Date(created)
  cycleStart.setFullYear(now.getFullYear())
  cycleStart.setMonth(now.getMonth())
  
  // If anniversary hasn't happened this month, go back one month
  if (cycleStart > now) {
    cycleStart.setMonth(cycleStart.getMonth() - 1)
  }
  
  return cycleStart
}
```

### Step 1.2: Update Trigger to Track Usage
```sql
-- Update the existing trigger to include progressive warnings
CREATE OR REPLACE FUNCTION update_user_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  call_minutes numeric;
  total_usage numeric;
BEGIN
  -- Get user from assistant
  SELECT ua.user_id INTO user_uuid
  FROM user_assistants ua
  WHERE ua.id = NEW.assistant_id;
  
  -- Set user_id in call log
  NEW.user_id := user_uuid;
  
  -- Calculate minutes for this call
  call_minutes := CEIL(COALESCE(NEW.duration_seconds, 0)::numeric / 60);
  
  -- Get total usage for current cycle
  SELECT CEIL(SUM(duration_seconds)::numeric / 60) INTO total_usage
  FROM call_logs
  WHERE user_id = user_uuid
  AND created_at >= (
    SELECT DATE_TRUNC('month', created_at) + 
           (DATE_PART('day', NOW()) - DATE_PART('day', created_at)) * INTERVAL '1 day'
    FROM profiles WHERE id = user_uuid
  );
  
  -- Log warning if approaching limit
  IF total_usage >= 8 AND total_usage < 10 THEN
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (
      user_uuid, 
      'usage_warning',
      jsonb_build_object(
        'minutes_used', total_usage,
        'minutes_remaining', 10 - total_usage,
        'warning_level', 'approaching_limit'
      )
    );
  END IF;
  
  -- Enforce limit if exceeded
  IF total_usage >= 10 THEN
    -- This will trigger the limit enforcement
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (
      user_uuid,
      'usage_limit_exceeded',
      jsonb_build_object(
        'minutes_used', total_usage,
        'enforcement_needed', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;
```

---

## PHASE 2: PROGRESSIVE WARNING SYSTEM

### Step 2.1: Create Warning Service
```typescript
// src/lib/services/usage-warning.service.ts
export async function checkUsageWarnings(userId: string): Promise<{
  showWarning: boolean;
  minutesUsed: number;
  minutesRemaining: number;
  warningLevel: 'none' | 'approaching' | 'critical' | 'exceeded';
}> {
  const usage = await calculateUserUsage(userId)
  
  let warningLevel: 'none' | 'approaching' | 'critical' | 'exceeded' = 'none'
  
  if (usage.totalMinutes >= 10) {
    warningLevel = 'exceeded'
  } else if (usage.totalMinutes >= 9) {
    warningLevel = 'critical'
  } else if (usage.totalMinutes >= 8) {
    warningLevel = 'approaching'
  }
  
  return {
    showWarning: warningLevel !== 'none',
    minutesUsed: usage.totalMinutes,
    minutesRemaining: Math.max(0, 10 - usage.totalMinutes),
    warningLevel
  }
}
```

### Step 2.2: Warning UI Component
```typescript
// src/components/ui/usage-warning.tsx
export function UsageWarning({ userId }: { userId: string }) {
  const [warning, setWarning] = useState<any>(null)
  
  useEffect(() => {
    checkUsageWarnings(userId).then(setWarning)
  }, [userId])
  
  if (!warning?.showWarning) return null
  
  const getWarningStyles = () => {
    switch (warning.warningLevel) {
      case 'approaching':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'critical':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'exceeded':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return ''
    }
  }
  
  const getWarningMessage = () => {
    switch (warning.warningLevel) {
      case 'approaching':
        return `You've used ${warning.minutesUsed} minutes. ${warning.minutesRemaining} minutes remaining this month.`
      case 'critical':
        return `⚠️ Only ${warning.minutesRemaining} minute remaining! Calls will be limited after this.`
      case 'exceeded':
        return `🚫 Monthly limit reached. All calls are now limited to 10 seconds.`
    }
  }
  
  return (
    <div className={`p-4 rounded-lg border ${getWarningStyles()}`}>
      <p className="font-medium">{getWarningMessage()}</p>
    </div>
  )
}
```

---

## PHASE 3: VAPI AUTO-UPDATE WHEN LIMIT REACHED

### Step 3.1: Store Original Assistant Config
```sql
-- Add column to store original VAPI config
ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS original_vapi_config JSONB,
ADD COLUMN IF NOT EXISTS limit_enforced BOOLEAN DEFAULT false;

-- Store original config when creating assistant
UPDATE user_assistants 
SET original_vapi_config = config 
WHERE original_vapi_config IS NULL;
```

### Step 3.2: VAPI Limit Enforcement Service
```typescript
// src/lib/services/vapi-limit-enforcement.ts
import { Vapi } from '@vapi-ai/server-sdk'

const vapi = new Vapi({ apiKey: process.env.VAPI_API_KEY! })

export async function enforceVapiLimits(userId: string) {
  const supabase = createServiceRoleClient('vapi_enforcement')
  
  // Get all user's active assistants
  const { data: assistants } = await supabase
    .from('user_assistants')
    .select('id, vapi_assistant_id, config, original_vapi_config')
    .eq('user_id', userId)
    .eq('is_disabled', false)
    .not('vapi_assistant_id', 'is', null)

  for (const assistant of assistants || []) {
    try {
      // Store original config if not already stored
      if (!assistant.original_vapi_config) {
        await supabase
          .from('user_assistants')
          .update({ original_vapi_config: assistant.config })
          .eq('id', assistant.id)
      }

      // Update VAPI assistant with limited config
      await vapi.assistants.update(assistant.vapi_assistant_id, {
        model: {
          provider: 'openai',
          model: assistant.config?.model || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `IMPORTANT: User has reached their monthly usage limit. 
                       You must keep this call under 10 seconds. 
                       Be extremely brief and helpful. 
                       Start by informing them: "You've reached your monthly limit, so I have just 10 seconds to help you."`
            }
          ],
          maxTokens: 50, // Limit response length
        },
        voice: {
          provider: 'azure',
          voiceId: assistant.config?.voice || 'en-US-JennyNeural',
          speed: 1.2, // Speak faster to fit more in 10 seconds
        },
        firstMessage: "You've reached your monthly limit, so I have just 10 seconds to help you. What do you need?",
        endCallAfterSpokenWords: {
          enabled: true,
          spokenWords: 30 // Force end after ~10 seconds of speech
        },
        maxDurationSeconds: 10, // Hard limit
      })

      // Mark as limit enforced
      await supabase
        .from('user_assistants')
        .update({ 
          limit_enforced: true,
          config: {
            ...assistant.config,
            limitEnforced: true,
            limitMessage: 'Monthly limit reached - 10 second calls only'
          }
        })
        .eq('id', assistant.id)

      console.log(`✅ Enforced limits on assistant ${assistant.id}`)
    } catch (error) {
      console.error(`Failed to update VAPI assistant ${assistant.vapi_assistant_id}:`, error)
    }
  }
}
```

### Step 3.3: Call End Webhook Handler
```typescript
// src/app/api/webhooks/vapi/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  if (body.type === 'call-ended') {
    const { assistantId, call } = body
    const durationSeconds = call.endedAt - call.startedAt // Calculate duration
    
    // Log the call (this triggers usage calculation)
    await supabase
      .from('call_logs')
      .insert({
        assistant_id: assistantId,
        duration_seconds: durationSeconds,
        caller_number: call.customer?.number,
        status: call.endedReason || 'completed',
        transcript: call.transcript,
        summary: call.summary,
        cost: call.cost?.total || 0
      })
    
    // Check if user just exceeded limit
    const { user_id } = await getAssistantOwner(assistantId)
    const usage = await calculateUserUsage(user_id)
    
    // If just crossed 10 minutes, enforce limits
    if (usage.totalMinutes >= 10) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('limit_enforced_at')
        .eq('id', user_id)
        .single()
      
      // Only enforce once per cycle
      if (!profile.limit_enforced_at || new Date(profile.limit_enforced_at) < calculateCurrentCycleStart(profile.created_at)) {
        await enforceVapiLimits(user_id)
        
        await supabase
          .from('profiles')
          .update({ limit_enforced_at: new Date() })
          .eq('id', user_id)
      }
    }
  }
  
  return NextResponse.json({ success: true })
}
```

---

## PHASE 4: MONTHLY RESET FROM SIGNUP DATE

### Step 4.1: Reset Service
```typescript
// src/lib/services/monthly-reset.service.ts
export async function resetUserLimits(userId: string) {
  const supabase = createServiceRoleClient('monthly_reset')
  
  // Get user's assistants with original configs
  const { data: assistants } = await supabase
    .from('user_assistants')
    .select('id, vapi_assistant_id, original_vapi_config')
    .eq('user_id', userId)
    .eq('limit_enforced', true)

  // Restore original VAPI configs
  for (const assistant of assistants || []) {
    if (assistant.vapi_assistant_id && assistant.original_vapi_config) {
      try {
        // Restore original VAPI configuration
        await vapi.assistants.update(assistant.vapi_assistant_id, {
          model: assistant.original_vapi_config.model || {},
          voice: assistant.original_vapi_config.voice || {},
          firstMessage: assistant.original_vapi_config.firstMessage || null,
          endCallAfterSpokenWords: { enabled: false },
          maxDurationSeconds: null, // Remove limit
        })

        // Update local state
        await supabase
          .from('user_assistants')
          .update({
            limit_enforced: false,
            config: assistant.original_vapi_config
          })
          .eq('id', assistant.id)

        console.log(`✅ Reset limits for assistant ${assistant.id}`)
      } catch (error) {
        console.error(`Failed to reset assistant ${assistant.vapi_assistant_id}:`, error)
      }
    }
  }

  // Clear limit enforcement flag
  await supabase
    .from('profiles')
    .update({ limit_enforced_at: null })
    .eq('id', userId)
}

// Cron job to run daily
export async function checkAndResetLimits() {
  const supabase = createServiceRoleClient('reset_cron')
  
  // Find users whose cycle should reset today
  const { data: users } = await supabase
    .from('profiles')
    .select('id, created_at')
  
  for (const user of users || []) {
    const cycleStart = calculateCurrentCycleStart(user.created_at)
    const today = new Date()
    
    // If today is the start of a new cycle
    if (
      cycleStart.getDate() === today.getDate() &&
      cycleStart.getMonth() === today.getMonth() &&
      cycleStart.getFullYear() === today.getFullYear()
    ) {
      await resetUserLimits(user.id)
      console.log(`🔄 Reset limits for user ${user.id}`)
    }
  }
}
```

### Step 4.2: Cron Job Configuration
```typescript
// src/app/api/cron/reset-limits/route.ts
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    await checkAndResetLimits()
    return NextResponse.json({ success: true, message: 'Limits reset check completed' })
  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
```

---

## PHASE 5: ASSISTANT CREATION LIMITS

### Step 5.1: Enforce 3 Assistant Limit
```typescript
// src/app/api/assistants/route.ts
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest()
    const body = await request.json()
    
    // Count current assistants
    const { count } = await supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('assistant_state', 'deleted')

    if (count >= 3) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ASSISTANT_LIMIT_REACHED',
          message: 'You have reached the maximum of 3 assistants',
          details: {
            current: count,
            limit: 3,
            suggestion: 'Delete an existing assistant to create a new one'
          }
        }
      }, { status: 200 }) // 200 OK - soft error, not auth failure
    }
    
    // Create assistant...
    
    return NextResponse.json({
      success: true,
      data: assistant,
      usage: {
        assistants: count + 1,
        limit: 3
      }
    })
  } catch (error) {
    // Handle real errors
  }
}
```

---

## TESTING CHECKLIST

- [ ] Calculate usage correctly from call_logs
- [ ] Show warning at 8 minutes
- [ ] Enforce VAPI limits at 10 minutes
- [ ] Store and restore original configs
- [ ] Reset on monthly anniversary of signup
- [ ] Block 4th assistant creation gracefully

---

## DATABASE CHANGES NEEDED

```sql
-- Add missing columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS limit_enforced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_assistants
ADD COLUMN IF NOT EXISTS original_vapi_config JSONB,
ADD COLUMN IF NOT EXISTS limit_enforced BOOLEAN DEFAULT false;
```

This implementation provides exactly what you need with clean separation of concerns!