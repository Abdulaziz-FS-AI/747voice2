# Duration Format Guide

## 📊 Database Column Format

### Current Setup
- **Column:** `call_info_log.duration_minutes`
- **Type:** Should be `NUMERIC(10,4)` or `FLOAT8`
- **Precision:** 4 decimal places (0.0001 minute = 0.006 second precision)

### Why Decimal Minutes?
- **30 seconds** = 0.5 minutes
- **15 seconds** = 0.25 minutes  
- **1 second** = 0.0167 minutes
- **90 seconds** = 1.5 minutes
- **5 seconds** = 0.0833 minutes

## 🔧 Implementation

### 1. Database Migration (Run in Supabase)
```sql
-- Change column to support decimal values
ALTER TABLE public.call_info_log 
ALTER COLUMN duration_minutes TYPE NUMERIC(10,4);

-- Or use FLOAT8 for simpler setup
ALTER TABLE public.call_info_log 
ALTER COLUMN duration_minutes TYPE FLOAT8;
```

### 2. Webhook Handler (Already Fixed)
```typescript
// Old (loses precision for short calls)
duration_minutes: Math.ceil(payload.duration_seconds / 60)  // 30s → 1 min ❌

// New (keeps exact value)
duration_minutes: payload.duration_seconds / 60  // 30s → 0.5 min ✅
```

### 3. Cost Calculation
```typescript
// Exact cost for short calls
const cost = duration_minutes * COST_PER_MINUTE
// 0.5 minutes * $0.10 = $0.05 (correct!)
// vs old: 1 minute * $0.10 = $0.10 (overcharged!)
```

## 📈 Benefits

### Before (Integer Minutes)
- 5-second call → stored as 1 minute → charged for full minute
- 30-second call → stored as 1 minute → charged for full minute
- Lost precision, overcharged customers

### After (Decimal Minutes)
- 5-second call → stored as 0.0833 minutes → charged $0.008
- 30-second call → stored as 0.5 minutes → charged $0.05
- Exact precision, fair charging

## 🎯 Make.com Configuration

Ensure your Make.com scenario sends the exact division:
```javascript
// In Make.com transformation
{
  "duration_seconds": {{vapi.duration}},  // Keep raw seconds
  // The webhook will convert: duration_seconds / 60
}
```

## 📊 Display Formatting

### For UI Display
```typescript
// Show human-readable format
function formatDuration(minutes: number): string {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60)
    return `${seconds}s`
  } else {
    const wholeMinutes = Math.floor(minutes)
    const seconds = Math.round((minutes - wholeMinutes) * 60)
    if (seconds > 0) {
      return `${wholeMinutes}m ${seconds}s`
    }
    return `${wholeMinutes}m`
  }
}

// Examples:
// 0.5 → "30s"
// 1.5 → "1m 30s"
// 0.0833 → "5s"
// 2.25 → "2m 15s"
```

## ✅ Testing

### Insert Test Data
```sql
-- Test various durations
INSERT INTO call_info_log (assistant_id, duration_minutes, vapi_call_id, started_at)
VALUES 
  ('YOUR_ASSISTANT_ID', 0.0833, 'test-5sec', NOW()),    -- 5 seconds
  ('YOUR_ASSISTANT_ID', 0.25, 'test-15sec', NOW()),     -- 15 seconds
  ('YOUR_ASSISTANT_ID', 0.5, 'test-30sec', NOW()),      -- 30 seconds
  ('YOUR_ASSISTANT_ID', 1.5, 'test-90sec', NOW()),      -- 90 seconds
  ('YOUR_ASSISTANT_ID', 2.75, 'test-165sec', NOW());    -- 2m 45s

-- Verify exact storage
SELECT 
  vapi_call_id,
  duration_minutes,
  duration_minutes * 60 as seconds,
  duration_minutes * 0.10 as cost
FROM call_info_log 
WHERE vapi_call_id LIKE 'test-%';
```

## 🚨 Important Notes

1. **Run the ALTER TABLE command** to change the column type
2. **Restart your app** after changing the column type
3. **Test with short calls** to verify precision is maintained
4. **Check analytics** shows correct costs for fractional minutes

The system now handles call durations with exact precision!