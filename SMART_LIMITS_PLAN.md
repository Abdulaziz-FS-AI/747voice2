# VOICE MATRIX - SMART LIMITS IMPLEMENTATION
## Enforce Limits Without Breaking Authentication

### 🎯 GOALS
- Enforce 3 assistant limit per user
- Enforce 10 minutes/month call limit
- NO authentication errors
- Graceful degradation when limits reached
- Clear user communication

---

## SOLUTION ARCHITECTURE

### 1. ASSISTANT CREATION LIMITS (Hard Stop)
```typescript
// src/app/api/assistants/route.ts
export async function POST(request: NextRequest) {
  try {
    // Authenticate user (always succeeds if logged in)
    const { user, profile } = await authenticateRequest()
    
    // Check assistant count
    const { count: currentCount } = await supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('assistant_state', 'deleted')

    // Soft limit - return friendly error, not auth error
    if (currentCount >= 3) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ASSISTANT_LIMIT_REACHED',
          message: 'You have reached the maximum of 3 assistants',
          details: {
            current: currentCount,
            limit: 3,
            suggestion: 'Delete an existing assistant to create a new one'
          }
        }
      }, { status: 200 }) // 200 - Not an error, just a limit
    }
    
    // Create assistant normally
    const assistant = await createAssistant(user.id, validatedData)
    
    return NextResponse.json({
      success: true,
      data: assistant,
      usage: {
        assistants: currentCount + 1,
        limit: 3
      }
    })
  } catch (error) {
    // Only real errors (not limits) return 500
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create assistant'
      }
    }, { status: 500 })
  }
}
```

### 2. CALL TIME LIMITS (Smart Degradation)

#### A. Track Usage Per Call
```typescript
// src/app/api/webhooks/vapi/route.ts
export async function POST(request: NextRequest) {
  const { type, call } = await request.json()
  
  switch (type) {
    case 'call-started':
      return handleCallStart(call)
    case 'call-ended':
      return handleCallEnd(call)
  }
}

async function handleCallStart(call: any) {
  const { assistant_id } = call
  
  // Get user's current usage
  const { user_id, profile } = await getAssistantOwner(assistant_id)
  
  // Check if limit reached
  if (profile.current_usage_minutes >= 10) {
    // Update VAPI assistant in real-time
    await vapi.assistants.update(assistant_id, {
      model: {
        messages: [{
          role: 'system',
          content: 'IMPORTANT: User has reached monthly limit. Keep this call under 10 seconds. Inform the user politely.'
        }],
        maxTokens: 50 // Limit response length
      },
      voice: {
        maxDuration: 10 // Force 10 second cutoff
      },
      firstMessage: "Hello! Quick notice - you've reached your monthly usage limit, so this call is limited to 10 seconds. How can I help you quickly?"
    })
  }
  
  return NextResponse.json({ status: 'ok' })
}

async function handleCallEnd(call: any) {
  const { assistant_id, duration } = call
  const durationMinutes = Math.ceil(duration / 60)
  
  // Update usage
  const { user_id } = await getAssistantOwner(assistant_id)
  await updateUserUsage(user_id, durationMinutes)
  
  // Check if user just hit the limit
  const { profile } = await getProfile(user_id)
  if (profile.current_usage_minutes >= 10 && profile.current_usage_minutes - durationMinutes < 10) {
    // User just crossed the limit - update all their assistants
    await enforceUsageLimit(user_id)
  }
  
  return NextResponse.json({ status: 'ok' })
}
```

#### B. Enforce Usage Limits on All Assistants
```typescript
// src/lib/services/limit-enforcement.service.ts
export async function enforceUsageLimit(userId: string) {
  // Get all user's active assistants
  const { data: assistants } = await supabase
    .from('user_assistants')
    .select('id, vapi_assistant_id')
    .eq('user_id', userId)
    .eq('is_disabled', false)

  // Update each assistant in VAPI
  for (const assistant of assistants) {
    if (assistant.vapi_assistant_id) {
      try {
        await vapi.assistants.update(assistant.vapi_assistant_id, {
          model: {
            messages: [{
              role: 'system',
              content: 'User has exceeded monthly limit. Limit all calls to 10 seconds maximum. Be polite but brief.'
            }]
          },
          voice: {
            maxDuration: 10
          },
          firstMessage: "Notice: Monthly usage limit reached. This call is limited to 10 seconds."
        })
        
        // Update local config
        await supabase
          .from('user_assistants')
          .update({
            config: {
              limitEnforced: true,
              maxDuration: 10,
              limitMessage: 'Monthly limit reached - 10 second calls only'
            }
          })
          .eq('id', assistant.id)
          
      } catch (error) {
        console.error(`Failed to update VAPI assistant ${assistant.vapi_assistant_id}:`, error)
      }
    }
  }
}
```

### 3. MONTHLY RESET MECHANISM

```typescript
// src/lib/services/usage-reset.service.ts
// Run this as a cron job daily
export async function resetMonthlyUsage() {
  const today = new Date()
  
  // Find users whose billing cycle ended
  const { data: usersToReset } = await supabase
    .from('profiles')
    .select('id, email')
    .lte('billing_cycle_end', today.toISOString())

  for (const user of usersToReset) {
    // Reset usage
    await supabase
      .from('profiles')
      .update({
        current_usage_minutes: 0,
        billing_cycle_start: today,
        billing_cycle_end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      })
      .eq('id', user.id)
    
    // Remove limit enforcement from assistants
    await removeUsageLimit(user.id)
  }
}

export async function removeUsageLimit(userId: string) {
  const { data: assistants } = await supabase
    .from('user_assistants')
    .select('id, vapi_assistant_id')
    .eq('user_id', userId)

  for (const assistant of assistants) {
    if (assistant.vapi_assistant_id) {
      // Reset VAPI assistant to normal
      await vapi.assistants.update(assistant.vapi_assistant_id, {
        voice: {
          maxDuration: null // Remove limit
        },
        firstMessage: null // Remove limit message
      })
      
      // Update local config
      await supabase
        .from('user_assistants')
        .update({
          config: {
            limitEnforced: false,
            maxDuration: null,
            limitMessage: null
          }
        })
        .eq('id', assistant.id)
    }
  }
}
```

### 4. USER INTERFACE UPDATES

```typescript
// src/components/dashboard/usage-card.tsx
export function UsageCard({ profile }: { profile: any }) {
  const minutesRemaining = Math.max(0, 10 - profile.current_usage_minutes)
  const assistantsRemaining = Math.max(0, 3 - profile.assistant_count)
  const limitReached = profile.current_usage_minutes >= 10
  
  return (
    <Card className={limitReached ? 'border-orange-500' : ''}>
      <CardContent>
        <h3>Usage This Month</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between">
              <span>Call Minutes</span>
              <span className={limitReached ? 'text-red-500 font-bold' : ''}>
                {profile.current_usage_minutes} / 10
              </span>
            </div>
            <Progress value={(profile.current_usage_minutes / 10) * 100} />
            {limitReached && (
              <p className="text-sm text-orange-500 mt-1">
                ⚠️ Limit reached - calls limited to 10 seconds
              </p>
            )}
          </div>
          
          <div>
            <div className="flex justify-between">
              <span>Assistants</span>
              <span className={assistantsRemaining === 0 ? 'text-red-500 font-bold' : ''}>
                {profile.assistant_count} / 3
              </span>
            </div>
            <Progress value={(profile.assistant_count / 3) * 100} />
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          Resets: {formatDate(profile.billing_cycle_end)}
        </p>
      </CardContent>
    </Card>
  )
}
```

### 5. ERROR HANDLING IMPROVEMENTS

```typescript
// src/lib/errors.ts
export class LimitError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'LimitError'
  }
}

// src/app/api/error-handler.ts
export function handleApiError(error: any): NextResponse {
  if (error instanceof LimitError) {
    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }, { status: 200 }) // 200 for limit errors
  }
  
  // Other errors return appropriate status codes
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  }, { status: 500 })
}
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Update assistant creation API to check limits gracefully
- [ ] Implement VAPI webhook handlers for call tracking
- [ ] Create limit enforcement service
- [ ] Add monthly reset cron job
- [ ] Update UI to show usage clearly
- [ ] Test limit enforcement without auth errors
- [ ] Verify VAPI assistant updates work correctly

---

## BENEFITS

✅ **No Authentication Errors** - Limits enforced without breaking auth flow
✅ **Clear Communication** - Users know exactly why they're limited
✅ **Graceful Degradation** - Service still works with restrictions
✅ **Automatic Recovery** - Limits reset monthly without intervention
✅ **Fair Usage** - Prevents abuse while keeping platform accessible